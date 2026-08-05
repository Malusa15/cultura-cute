-- ============================================================================
-- Cultura.Cute — ventas, encargos, reservas y envíos
--
-- Se corre una sola vez, desde el SQL Editor del panel de Supabase, DESPUÉS de
-- schema.sql. Es idempotente: se puede volver a ejecutar sin romper nada.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Ventas
-- ----------------------------------------------------------------------------

create table if not exists ventas (
  id               uuid primary key default gen_random_uuid(),
  -- Número corto para nombrar el pedido en el chat ("tu pedido #14"): el uuid
  -- no se puede dictar por WhatsApp.
  numero           bigserial unique,
  -- 'carrito' entra sola desde la tienda; 'panel' la cargás vos a mano.
  origen           text not null default 'carrito' check (origen in ('carrito', 'panel')),
  -- pendiente → confirmada descuenta stock; cancelada lo repone. Ver el trigger
  -- de más abajo.
  estado           text not null default 'pendiente'
                     check (estado in ('pendiente', 'confirmada', 'entregada', 'cancelada')),
  cliente_nombre   text,
  cliente_contacto text,
  -- En pesos enteros, igual que productos.precio. Lo calcula la base, nunca el
  -- cliente: si viniera del navegador cualquiera podría mandar total = 0.
  total            integer not null default 0 check (total >= 0),
  notas            text,
  creada_en        timestamptz not null default now(),
  actualizada_en   timestamptz not null default now()
);

create table if not exists venta_items (
  id               uuid primary key default gen_random_uuid(),
  venta_id         uuid not null references ventas(id) on delete cascade,
  -- Si después se borra la prenda, la venta tiene que seguir siendo legible,
  -- por eso el nombre y el precio quedan copiados acá y no se leen del catálogo.
  producto_id      uuid references productos(id) on delete set null,
  nombre           text not null,
  talle            text not null,
  cantidad         integer not null check (cantidad > 0),
  precio_unitario  integer not null check (precio_unitario >= 0)
);

create index if not exists venta_items_venta_idx on venta_items(venta_id);
create index if not exists ventas_estado_idx on ventas(estado);

-- ----------------------------------------------------------------------------
-- Encargos: prendas a pedido que todavía no existen en el catálogo.
-- ----------------------------------------------------------------------------

create table if not exists encargos (
  id               uuid primary key default gen_random_uuid(),
  numero           bigserial unique,
  cliente_nombre   text not null,
  cliente_contacto text,
  descripcion      text not null,
  talle            text,
  precio_estimado  integer check (precio_estimado >= 0),
  sena             integer not null default 0 check (sena >= 0),
  estado           text not null default 'pedido'
                     check (estado in ('pedido', 'en_proceso', 'listo', 'entregado', 'cancelado')),
  fecha_entrega    date,
  notas            text,
  creado_en        timestamptz not null default now(),
  actualizado_en   timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Reservas: una prenda apartada para alguien.
--
-- La reserva descuenta el stock igual que una venta, porque si no la prenda
-- sigue figurando disponible en la tienda y se vende dos veces. Al cancelarla o
-- vencerla el stock vuelve. Ver el trigger de más abajo.
-- ----------------------------------------------------------------------------

create table if not exists reservas (
  id               uuid primary key default gen_random_uuid(),
  numero           bigserial unique,
  producto_id      uuid not null references productos(id) on delete cascade,
  talle            text not null,
  cantidad         integer not null default 1 check (cantidad > 0),
  cliente_nombre   text not null,
  cliente_contacto text,
  vence_en         date,
  estado           text not null default 'activa'
                     check (estado in ('activa', 'concretada', 'cancelada', 'vencida')),
  notas            text,
  creada_en        timestamptz not null default now(),
  actualizada_en   timestamptz not null default now()
);

create index if not exists reservas_estado_idx on reservas(estado);

-- ----------------------------------------------------------------------------
-- Envíos: cómo sale cada venta.
-- ----------------------------------------------------------------------------

create table if not exists envios (
  id             uuid primary key default gen_random_uuid(),
  -- Un envío por venta: alcanza para el volumen de la marca y evita listas
  -- ambiguas de "qué falta despachar".
  venta_id       uuid not null unique references ventas(id) on delete cascade,
  metodo         text not null default 'correo' check (metodo in ('correo', 'moto', 'retiro')),
  destinatario   text,
  direccion      text,
  localidad      text,
  codigo_postal  text,
  costo          integer not null default 0 check (costo >= 0),
  seguimiento    text,
  estado         text not null default 'pendiente'
                   check (estado in ('pendiente', 'despachado', 'entregado')),
  despachado_en  timestamptz,
  notas          text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists envios_estado_idx on envios(estado);

-- ----------------------------------------------------------------------------
-- actualizado_en / actualizada_en al día
-- ----------------------------------------------------------------------------

create or replace function tocar_actualizada_en()
returns trigger
language plpgsql
as $$
begin
  new.actualizada_en = now();
  return new;
end;
$$;

drop trigger if exists ventas_actualizada_en on ventas;
create trigger ventas_actualizada_en
  before update on ventas
  for each row execute function tocar_actualizada_en();

drop trigger if exists reservas_actualizada_en on reservas;
create trigger reservas_actualizada_en
  before update on reservas
  for each row execute function tocar_actualizada_en();

drop trigger if exists encargos_actualizado_en on encargos;
create trigger encargos_actualizado_en
  before update on encargos
  for each row execute function tocar_actualizado_en();

drop trigger if exists envios_actualizado_en on envios;
create trigger envios_actualizado_en
  before update on envios
  for each row execute function tocar_actualizado_en();

-- ----------------------------------------------------------------------------
-- Movimiento de stock
--
-- Vive en la base y no en el JavaScript a propósito: el stock se toca desde el
-- panel, desde la tienda y desde acá, y si la resta se hiciera en el cliente
-- dos pestañas abiertas podrían pisarse. Acá pasa dentro de la transacción.
-- ----------------------------------------------------------------------------

-- p_signo = -1 descuenta, +1 repone.
create or replace function mover_stock_de_venta(p_venta uuid, p_signo integer)
returns void
language plpgsql
as $$
begin
  update talles t
  set stock = greatest(t.stock + p_signo * vi.cantidad, 0)
  from venta_items vi
  where vi.venta_id = p_venta
    and t.producto_id = vi.producto_id
    and t.talle = vi.talle;
end;
$$;

-- Una venta descuenta stock cuando se confirma, y lo repone si después se
-- cancela. Entregada ya viene de confirmada, así que no vuelve a descontar.
create or replace function stock_segun_estado_de_venta()
returns trigger
language plpgsql
as $$
declare
  descontaba boolean := old.estado in ('confirmada', 'entregada');
  descuenta  boolean := new.estado in ('confirmada', 'entregada');
begin
  if descuenta and not descontaba then
    perform mover_stock_de_venta(new.id, -1);
  elsif descontaba and not descuenta then
    perform mover_stock_de_venta(new.id, 1);
  end if;

  return new;
end;
$$;

drop trigger if exists ventas_stock on ventas;
create trigger ventas_stock
  after update of estado on ventas
  for each row execute function stock_segun_estado_de_venta();

-- Las reservas apartan stock desde que se crean.
create or replace function stock_de_reserva()
returns trigger
language plpgsql
as $$
declare
  apartaba boolean := tg_op = 'UPDATE' and old.estado = 'activa';
  aparta   boolean := tg_op <> 'DELETE' and new.estado = 'activa';
begin
  if tg_op = 'DELETE' then
    if old.estado = 'activa' then
      update talles set stock = stock + old.cantidad
      where producto_id = old.producto_id and talle = old.talle;
    end if;
    return old;
  end if;

  if aparta and not apartaba then
    update talles set stock = greatest(stock - new.cantidad, 0)
    where producto_id = new.producto_id and talle = new.talle;
  elsif apartaba and not aparta then
    -- 'concretada' significa que la reserva terminó en venta: la prenda ya
    -- salió, así que el stock NO vuelve.
    if new.estado <> 'concretada' then
      update talles set stock = stock + old.cantidad
      where producto_id = old.producto_id and talle = old.talle;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists reservas_stock on reservas;
create trigger reservas_stock
  after insert or update or delete on reservas
  for each row execute function stock_de_reserva();

-- ----------------------------------------------------------------------------
-- Alta de pedidos desde la tienda
--
-- La tienda no tiene sesión, así que entra como `anon`. En vez de darle permiso
-- de INSERT sobre las tablas (que le dejaría escribir cualquier cosa: precios
-- inventados, estado 'confirmada' para vaciarte el stock), se le da acceso a
-- esta única función. Corre con permisos del dueño (security definer) y arma el
-- pedido leyendo los precios de la base, no del navegador.
-- ----------------------------------------------------------------------------

create or replace function registrar_pedido(
  p_cliente_nombre   text,
  p_cliente_contacto text,
  p_items            jsonb
)
returns table (id uuid, numero bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id       uuid;
  v_numero   bigint;
  v_total    integer := 0;
  v_item     jsonb;
  v_producto productos%rowtype;
  v_cantidad integer;
  v_talle    text;
  v_stock    integer;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'El pedido no tiene prendas';
  end if;

  -- Tope defensivo: sin esto, `anon` podría mandar un array gigante.
  if jsonb_array_length(p_items) > 50 then
    raise exception 'El pedido tiene demasiadas prendas';
  end if;

  insert into ventas (origen, estado, cliente_nombre, cliente_contacto, total)
  values (
    'carrito',
    'pendiente',
    nullif(btrim(coalesce(p_cliente_nombre, '')), ''),
    nullif(btrim(coalesce(p_cliente_contacto, '')), ''),
    0
  )
  returning ventas.id, ventas.numero into v_id, v_numero;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_producto
    from productos
    where productos.id = (v_item->>'producto_id')::uuid
      and productos.activo;

    if not found then
      raise exception 'Hay una prenda del pedido que ya no está disponible';
    end if;

    v_talle    := btrim(coalesce(v_item->>'talle', ''));
    v_cantidad := greatest(coalesce((v_item->>'cantidad')::integer, 1), 1);

    select stock into v_stock
    from talles
    where producto_id = v_producto.id and talle = v_talle;

    if not found then
      raise exception 'El talle % de % ya no existe', v_talle, v_producto.nombre;
    end if;

    -- No se descuenta acá (eso pasa al confirmar), pero sí se corta si el
    -- carrito quedó viejo y pide más de lo que hay.
    if v_cantidad > v_stock then
      raise exception 'Quedan % unidades de % talle %', v_stock, v_producto.nombre, v_talle;
    end if;

    insert into venta_items (venta_id, producto_id, nombre, talle, cantidad, precio_unitario)
    values (v_id, v_producto.id, v_producto.nombre, v_talle, v_cantidad, v_producto.precio);

    v_total := v_total + v_producto.precio * v_cantidad;
  end loop;

  update ventas set total = v_total where ventas.id = v_id;

  return query select v_id, v_numero;
end;
$$;

revoke all on function registrar_pedido(text, text, jsonb) from public;
grant execute on function registrar_pedido(text, text, jsonb) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- Row Level Security
--
-- Todo esto es información interna del negocio (nombres, contactos, domicilios,
-- cuánto se vendió): `anon` no lee NADA. Lo único que puede hacer la tienda es
-- llamar a registrar_pedido, que corre por afuera de estas políticas.
-- ----------------------------------------------------------------------------

alter table ventas      enable row level security;
alter table venta_items enable row level security;
alter table encargos    enable row level security;
alter table reservas    enable row level security;
alter table envios      enable row level security;

drop policy if exists "ventas solo autenticadas" on ventas;
create policy "ventas solo autenticadas"
  on ventas for all
  to authenticated
  using (true) with check (true);

drop policy if exists "items solo autenticados" on venta_items;
create policy "items solo autenticados"
  on venta_items for all
  to authenticated
  using (true) with check (true);

drop policy if exists "encargos solo autenticados" on encargos;
create policy "encargos solo autenticados"
  on encargos for all
  to authenticated
  using (true) with check (true);

drop policy if exists "reservas solo autenticadas" on reservas;
create policy "reservas solo autenticadas"
  on reservas for all
  to authenticated
  using (true) with check (true);

drop policy if exists "envios solo autenticados" on envios;
create policy "envios solo autenticados"
  on envios for all
  to authenticated
  using (true) with check (true);
