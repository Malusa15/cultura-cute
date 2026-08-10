-- ============================================================================
-- Cultura.Cute — estadísticas de visitas a la tienda
--
-- Se corre una sola vez, desde el SQL Editor del panel de Supabase, DESPUÉS de
-- schema.sql y de ventas.sql (de ahí sale la función `tocar_actualizada_en`).
-- Es idempotente: se puede volver a ejecutar sin romper nada.
--
-- QUÉ SE GUARDA Y QUÉ NO
--
-- No se guarda ninguna IP, ningún nombre y ninguna cookie. El campo `visitante`
-- es un código armado por la función de Vercel mezclando la IP con el día y una
-- sal secreta: sirve para no contar diez veces a la misma persona el mismo día,
-- y al día siguiente el mismo visitante genera un código distinto. O sea que no
-- se puede seguir a nadie de un día para el otro, ni volver de ese código a la
-- IP. La ciudad es la que estima Vercel por la IP, con la precisión de una
-- ciudad y nada más.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Una fila por visita.
--
-- El `id` lo genera el navegador y no la base: la visita se anota dos veces
-- —una al entrar y otra al irse, con el tiempo ya medido— y las dos tienen que
-- caer en la misma fila. Sin un id conocido de antemano, la segunda no sabría
-- cuál actualizar.
-- ----------------------------------------------------------------------------

create table if not exists visitas (
  id             uuid primary key,
  visitante      text not null,
  -- La fecha aparte del timestamp para poder filtrar e indexar por día sin
  -- convertir zonas horarias en cada consulta.
  fecha          date not null default current_date,
  pais           text,
  ciudad         text,
  region         text,
  dispositivo    text not null default 'compu'
                   check (dispositivo in ('celular', 'tablet', 'compu')),
  -- De dónde llegó: instagram, google, whatsapp, directo…
  origen         text not null default 'directo',
  -- El sitio de donde venía, solo el dominio. Sin la dirección completa: esa
  -- puede llevar datos de la persona en la URL.
  referente      text,
  segundos       integer not null default 0 check (segundos >= 0),
  creada_en      timestamptz not null default now(),
  actualizada_en timestamptz not null default now()
);

create index if not exists visitas_fecha_idx     on visitas(fecha desc);
create index if not exists visitas_visitante_idx on visitas(visitante);

-- ----------------------------------------------------------------------------
-- Cuánto estuvo esa visita en cada sección de la página.
--
-- Tabla aparte y no un jsonb porque es lo que más se suma y se ordena ("¿qué
-- sección miran más?"), y en columnas eso lo hace Postgres.
-- ----------------------------------------------------------------------------

create table if not exists visita_secciones (
  id        uuid primary key default gen_random_uuid(),
  visita_id uuid not null references visitas(id) on delete cascade,
  -- El id del <section> de la tienda: inicio, tienda, servicios, contacto…
  seccion   text not null,
  segundos  integer not null default 0 check (segundos >= 0),
  -- Una fila por sección y visita: al irse se reescriben los tiempos finales.
  unique (visita_id, seccion)
);

create index if not exists visita_secciones_idx on visita_secciones(visita_id);

drop trigger if exists visitas_actualizada_en on visitas;
create trigger visitas_actualizada_en
  before update on visitas
  for each row execute function tocar_actualizada_en();

-- ----------------------------------------------------------------------------
-- Alta de visitas desde la tienda
--
-- La tienda no tiene sesión: entra como `anon`. En vez de darle INSERT sobre las
-- tablas —que le dejaría escribir cualquier cosa, o borrar— se le da acceso a
-- esta única función, que corre con permisos del dueño y recorta todo lo que
-- entra. Es el mismo patrón que `registrar_pedido` del carrito.
--
-- Todos los topes de acá son defensivos: lo que llega viene de un navegador, o
-- sea de cualquiera. Un texto larguísimo o un tiempo absurdo no tienen que poder
-- ensuciar los números.
-- ----------------------------------------------------------------------------

create or replace function registrar_visita(p_id uuid, p_datos jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seccion   jsonb;
  v_segundos  integer;
  -- Ocho horas. Una pestaña olvidada abierta toda la noche no puede figurar
  -- como que alguien miró la tienda durante nueve horas.
  c_tope_seg  constant integer := 28800;
begin
  if p_id is null then
    raise exception 'Falta el identificador de la visita';
  end if;

  v_segundos := least(greatest(coalesce((p_datos->>'segundos')::integer, 0), 0), c_tope_seg);

  insert into visitas (id, visitante, pais, ciudad, region, dispositivo, origen, referente, segundos)
  values (
    p_id,
    left(coalesce(nullif(btrim(p_datos->>'visitante'), ''), 'desconocido'), 64),
    left(nullif(btrim(coalesce(p_datos->>'pais', '')), ''), 4),
    left(nullif(btrim(coalesce(p_datos->>'ciudad', '')), ''), 80),
    left(nullif(btrim(coalesce(p_datos->>'region', '')), ''), 80),
    case when p_datos->>'dispositivo' in ('celular', 'tablet', 'compu')
         then p_datos->>'dispositivo' else 'compu' end,
    left(coalesce(nullif(btrim(p_datos->>'origen'), ''), 'directo'), 40),
    left(nullif(btrim(coalesce(p_datos->>'referente', '')), ''), 120),
    v_segundos
  )
  on conflict (id) do update set
    -- Al irse solo se actualiza el tiempo: el resto ya se anotó al entrar y no
    -- puede cambiar a mitad de la visita. Y se queda con el mayor, así un aviso
    -- que llega tarde y desordenado no achica el tiempo ya guardado.
    segundos = greatest(visitas.segundos, excluded.segundos);

  -- Las secciones vienen como [{ "seccion": "tienda", "segundos": 40 }, …]
  if jsonb_typeof(p_datos->'secciones') = 'array'
     and jsonb_array_length(p_datos->'secciones') <= 40 then
    for v_seccion in select * from jsonb_array_elements(p_datos->'secciones') loop
      insert into visita_secciones (visita_id, seccion, segundos)
      values (
        p_id,
        left(btrim(coalesce(v_seccion->>'seccion', 'otra')), 60),
        least(greatest(coalesce((v_seccion->>'segundos')::integer, 0), 0), c_tope_seg)
      )
      on conflict (visita_id, seccion) do update set
        segundos = greatest(visita_secciones.segundos, excluded.segundos);
    end loop;
  end if;
end;
$$;

revoke all on function registrar_visita(uuid, jsonb) from public;
grant execute on function registrar_visita(uuid, jsonb) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- Row Level Security
--
-- `anon` no lee ni escribe nada directamente: lo único que puede hacer la tienda
-- es llamar a registrar_visita, que corre por afuera de estas políticas. Los
-- números los ve solamente quien entra al panel.
-- ----------------------------------------------------------------------------

alter table visitas          enable row level security;
alter table visita_secciones enable row level security;

drop policy if exists "visitas solo autenticadas" on visitas;
create policy "visitas solo autenticadas"
  on visitas for all
  to authenticated
  using (true) with check (true);

drop policy if exists "secciones solo autenticadas" on visita_secciones;
create policy "secciones solo autenticadas"
  on visita_secciones for all
  to authenticated
  using (true) with check (true);
