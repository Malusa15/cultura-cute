-- ============================================================================
-- Cultura.Cute — economía: cajas y movimientos de plata
--
-- Se corre una sola vez, desde el SQL Editor del panel de Supabase, DESPUÉS de
-- schema.sql y de ventas.sql (los movimientos se pueden atar a una venta). Es
-- idempotente: se puede volver a ejecutar sin romper nada.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Cajas: dónde está la plata.
--
-- Arranca con dos, que son las que se usan a diario:
--   · Caja chica  → el efectivo del día a día (una tela, el flete, el café).
--   · Caja grande → el fondo de la marca (lo que se guarda, la cuenta, el banco).
--
-- Es una tabla y no dos valores fijos porque tarde o temprano aparece una
-- tercera (Mercado Pago, la cuenta del banco) y agregarla no debería pedir SQL.
-- El `tipo` sigue siendo chica/grande: dice cómo se comporta, no cuántas hay.
-- ----------------------------------------------------------------------------

create table if not exists cajas (
  id             uuid primary key default gen_random_uuid(),
  nombre         text not null unique,
  tipo           text not null default 'chica' check (tipo in ('chica', 'grande')),
  -- Lo que había adentro el día que se empezó a anotar. Sin esto el saldo
  -- arrancaría en cero y nunca coincidiría con la plata real.
  saldo_inicial  numeric(12, 2) not null default 0,
  activa         boolean not null default true,
  -- Para que la caja chica salga siempre antes que la grande.
  orden          integer not null default 0,
  notas          text,
  creada_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

-- Las dos cajas de arranque. El `where not exists` mira el tipo y no el nombre:
-- si la caja chica se renombró a "Efectivo", volver a correr esto no la duplica.
insert into cajas (nombre, tipo, orden, notas)
select 'Caja chica', 'chica', 1, 'Efectivo del día a día'
where not exists (select 1 from cajas where tipo = 'chica');

insert into cajas (nombre, tipo, orden, notas)
select 'Caja grande', 'grande', 2, 'El fondo de la marca'
where not exists (select 1 from cajas where tipo = 'grande');

-- ----------------------------------------------------------------------------
-- Movimientos: cada vez que entra o sale plata.
--
-- Una sola tabla para todo (gastos, sueldos, pagos, cobros, traspasos) en vez de
-- una por concepto. El saldo de una caja es la suma de sus renglones, y con
-- tablas separadas habría que sumar cinco listas y no perder ninguna. El `tipo`
-- es lo que distingue un gasto de un sueldo.
--
-- `direccion` se guarda aunque casi siempre se deduzca del tipo: así el saldo se
-- calcula sumando y restando sin tener que saber qué significa cada tipo, y un
-- tipo nuevo no obliga a revisar la cuenta.
-- ----------------------------------------------------------------------------

create table if not exists movimientos (
  id             uuid primary key default gen_random_uuid(),
  -- Número corto para nombrarlo ("el movimiento #40") al buscar un comprobante.
  numero         bigserial unique,
  -- restrict y no cascade: borrar una caja no puede llevarse la historia de la
  -- plata puesta. Primero se mueven los movimientos, después se borra la caja.
  caja_id        uuid not null references cajas(id) on delete restrict,
  -- El día en que pasó, que no siempre es el día en que se carga.
  fecha          date not null default current_date,
  tipo           text not null default 'gasto'
                   check (tipo in ('venta', 'ingreso', 'aporte', 'gasto', 'sueldo',
                                   'pago', 'retiro', 'ajuste', 'traspaso')),
  direccion      text not null check (direccion in ('entra', 'sale')),
  -- Siempre positivo: el signo lo pone `direccion`. Guardar montos negativos
  -- haría que un gasto cargado mal sumara en vez de restar.
  monto          numeric(12, 2) not null check (monto > 0),
  concepto       text not null,
  -- Rubro del gasto (telas, alquiler, envíos…). Sin check a propósito: la lista
  -- la define RUBROS en src/lib/economia.js y sumar uno no debería pedir SQL.
  rubro          text,
  metodo         text not null default 'efectivo',
  -- A quién se le pagó o de quién vino: la empleada del sueldo, el proveedor.
  persona        text,
  comprobante    text,
  -- Si el movimiento es el cobro de una venta del panel, queda atado a ella.
  -- set null y no cascade: borrar la venta no puede borrar la plata cobrada.
  venta_id       uuid references ventas(id) on delete set null,
  -- Une las dos patas de un traspaso (la salida de una caja y la entrada en la
  -- otra) para poder borrarlas juntas.
  traspaso_id    uuid,
  notas          text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists movimientos_fecha_idx    on movimientos(fecha desc);
create index if not exists movimientos_caja_idx     on movimientos(caja_id);
create index if not exists movimientos_tipo_idx     on movimientos(tipo);
create index if not exists movimientos_traspaso_idx on movimientos(traspaso_id);

-- ----------------------------------------------------------------------------
-- actualizado_en al día (la función viene de schema.sql)
-- ----------------------------------------------------------------------------

drop trigger if exists cajas_actualizado_en on cajas;
create trigger cajas_actualizado_en
  before update on cajas
  for each row execute function tocar_actualizado_en();

drop trigger if exists movimientos_actualizado_en on movimientos;
create trigger movimientos_actualizado_en
  before update on movimientos
  for each row execute function tocar_actualizado_en();

-- ----------------------------------------------------------------------------
-- Row Level Security
--
-- Esto es lo más privado del proyecto: cuánto entra, cuánto se gasta y cuánto
-- cobra cada persona. `anon` no lee ni escribe nada, ni siquiera los nombres de
-- las cajas.
-- ----------------------------------------------------------------------------

alter table cajas       enable row level security;
alter table movimientos enable row level security;

drop policy if exists "cajas solo autenticadas" on cajas;
create policy "cajas solo autenticadas"
  on cajas for all
  to authenticated
  using (true) with check (true);

drop policy if exists "movimientos solo autenticados" on movimientos;
create policy "movimientos solo autenticados"
  on movimientos for all
  to authenticated
  using (true) with check (true);
