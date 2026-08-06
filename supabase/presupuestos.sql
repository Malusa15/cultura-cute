-- ============================================================================
-- Cultura.Cute — presupuestos
--
-- Se corre una sola vez, desde el SQL Editor del panel de Supabase, DESPUÉS de
-- schema.sql y de ventas.sql. Es idempotente: se puede volver a ejecutar sin
-- romper nada.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Presupuestos: lo que se cotiza antes de que exista el encargo.
--
-- Un presupuesto NO mueve stock ni plata: es un papel para mandarle a la
-- clienta. Si lo acepta, recién ahí se carga como encargo en la solapa de al
-- lado.
-- ----------------------------------------------------------------------------

create table if not exists presupuestos (
  id               uuid primary key default gen_random_uuid(),
  -- Número corto para nombrarlo en el chat y en el PDF ("presupuesto #7").
  numero           bigserial unique,
  cliente_nombre   text not null,
  cliente_contacto text,
  -- Qué se está cotizando y cómo es. `prenda` es el título del PDF.
  prenda           text not null,
  descripcion      text,
  talle            text,

  -- Las medidas del cuerpo van en jsonb y no en veinte columnas porque son
  -- muchas, casi siempre se llenan a medias, y la lista cambia según la prenda.
  -- Las claves las define MEDIDAS en src/lib/presupuestos.js. Todas en cm.
  medidas          jsonb not null default '{}'::jsonb,

  -- Mano de obra: horas estimadas por lo que vale la hora de taller.
  horas_trabajo    numeric(7, 2) not null default 0 check (horas_trabajo >= 0),
  valor_hora       numeric(12, 2) not null default 0 check (valor_hora >= 0),

  -- Sobre el costo (materiales + mano de obra) se aplica el margen, y recién
  -- después el descuento. Margen en porcentaje, descuento en pesos.
  margen           numeric(6, 2) not null default 0 check (margen >= 0),
  descuento        numeric(12, 2) not null default 0 check (descuento >= 0),

  -- El total lo calcula el panel al guardar. Se guarda hecho para poder
  -- listarlo sin traer todos los materiales de cada presupuesto.
  total            numeric(12, 2) not null default 0 check (total >= 0),

  estado           text not null default 'borrador'
                     check (estado in ('borrador', 'enviado', 'aceptado', 'rechazado', 'vencido')),
  -- Cuántos días vale el precio. Va impreso en el PDF: los materiales cambian
  -- de precio y un presupuesto de hace tres meses ya no se sostiene.
  validez_dias     integer not null default 15 check (validez_dias >= 0),
  fecha_entrega    date,
  notas            text,
  creado_en        timestamptz not null default now(),
  actualizado_en   timestamptz not null default now()
);

create index if not exists presupuestos_estado_idx on presupuestos(estado);

-- ----------------------------------------------------------------------------
-- Materiales de cada presupuesto: una fila por tela, aplique, tintura, etc.
--
-- Es una tabla aparte y no un jsonb porque la cantidad de renglones es
-- variable y cada uno se suma: así el subtotal se puede calcular en SQL si
-- alguna vez hace falta.
-- ----------------------------------------------------------------------------

create table if not exists presupuesto_materiales (
  id              uuid primary key default gen_random_uuid(),
  presupuesto_id  uuid not null references presupuestos(id) on delete cascade,
  -- Para que los renglones salgan en el PDF en el mismo orden en que se cargaron.
  orden           integer not null default 0,
  -- Sin check a propósito: la lista de tipos la define el panel (TIPOS_MATERIAL
  -- en src/lib/presupuestos.js) y agregar uno nuevo no debería pedir tocar SQL.
  tipo            text not null default 'tela',
  detalle         text not null,
  cantidad        numeric(10, 2) not null default 1 check (cantidad >= 0),
  unidad          text not null default 'u',
  precio_unitario numeric(12, 2) not null default 0 check (precio_unitario >= 0)
);

create index if not exists presupuesto_materiales_idx
  on presupuesto_materiales(presupuesto_id);

-- ----------------------------------------------------------------------------
-- actualizado_en al día (la función viene de schema.sql)
-- ----------------------------------------------------------------------------

drop trigger if exists presupuestos_actualizado_en on presupuestos;
create trigger presupuestos_actualizado_en
  before update on presupuestos
  for each row execute function tocar_actualizado_en();

-- ----------------------------------------------------------------------------
-- Row Level Security
--
-- Igual que ventas y encargos: son datos internos (nombres, medidas del cuerpo,
-- cuánto cuesta cada tela). `anon` no lee ni escribe nada.
-- ----------------------------------------------------------------------------

alter table presupuestos           enable row level security;
alter table presupuesto_materiales enable row level security;

drop policy if exists "presupuestos solo autenticados" on presupuestos;
create policy "presupuestos solo autenticados"
  on presupuestos for all
  to authenticated
  using (true) with check (true);

drop policy if exists "materiales solo autenticados" on presupuesto_materiales;
create policy "materiales solo autenticados"
  on presupuesto_materiales for all
  to authenticated
  using (true) with check (true);
