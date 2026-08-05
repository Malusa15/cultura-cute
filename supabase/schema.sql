-- ============================================================================
-- Cultura.Cute — esquema de la base
--
-- Se corre una sola vez, desde el SQL Editor del panel de Supabase.
-- Es idempotente: se puede volver a ejecutar sin romper nada.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tablas
-- ----------------------------------------------------------------------------

create table if not exists categorias (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null unique,
  descripcion text,
  orden       integer not null default 0,
  creada_en   timestamptz not null default now()
);

create table if not exists subcategorias (
  id           uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references categorias(id) on delete cascade,
  nombre       text not null,
  orden        integer not null default 0,
  unique (categoria_id, nombre)
);

create table if not exists productos (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null,
  -- El precio va en pesos enteros: no hay centavos y así se evita el redondeo
  -- de los flotantes.
  precio          integer not null check (precio >= 0),
  genero          text,
  categoria_id    uuid references categorias(id) on delete set null,
  subcategoria_id uuid references subcategorias(id) on delete set null,
  descripcion     text,
  -- { "largo": "34 cm", "cintura": "64-74 cm" }: las medidas cambian según la
  -- prenda, así que no conviene una columna por cada una.
  medidas         jsonb not null default '{}'::jsonb,
  materiales      text[] not null default '{}',
  composicion     text,
  color           text,
  estilo          text[] not null default '{}',
  imagenes        text[] not null default '{}',
  -- Con activo = false la prenda desaparece de la tienda pero no se borra.
  activo          boolean not null default true,
  orden           integer not null default 0,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);

-- El stock vive acá y no en productos porque va por talle: que S esté agotado
-- no tiene que impedir vender el M.
create table if not exists talles (
  id          uuid primary key default gen_random_uuid(),
  producto_id uuid not null references productos(id) on delete cascade,
  talle       text not null,
  stock       integer not null default 0 check (stock >= 0),
  orden       integer not null default 0,
  unique (producto_id, talle)
);

create index if not exists talles_producto_idx on talles(producto_id);
create index if not exists productos_activo_idx on productos(activo);

-- Mantiene actualizado_en al día sin depender de que lo mande el cliente.
create or replace function tocar_actualizado_en()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

drop trigger if exists productos_actualizado_en on productos;
create trigger productos_actualizado_en
  before update on productos
  for each row execute function tocar_actualizado_en();

-- ----------------------------------------------------------------------------
-- Row Level Security
--
-- Sin esto, cualquiera con la anon key (que viaja en el JavaScript del sitio y
-- es pública por diseño) podría escribir en la base. Las políticas son lo único
-- que separa "ver la tienda" de "editar el catálogo".
-- ----------------------------------------------------------------------------

alter table categorias    enable row level security;
alter table subcategorias enable row level security;
alter table productos     enable row level security;
alter table talles        enable row level security;

-- Lectura pública -------------------------------------------------------------

drop policy if exists "lectura publica de categorias" on categorias;
create policy "lectura publica de categorias"
  on categorias for select
  to anon, authenticated
  using (true);

drop policy if exists "lectura publica de subcategorias" on subcategorias;
create policy "lectura publica de subcategorias"
  on subcategorias for select
  to anon, authenticated
  using (true);

-- Los visitantes solo ven las prendas publicadas; el panel, todas.
drop policy if exists "lectura publica de productos activos" on productos;
create policy "lectura publica de productos activos"
  on productos for select
  to anon
  using (activo = true);

drop policy if exists "lectura completa autenticada" on productos;
create policy "lectura completa autenticada"
  on productos for select
  to authenticated
  using (true);

-- Los talles de una prenda oculta no se pueden leer sin estar autenticada.
drop policy if exists "lectura publica de talles" on talles;
create policy "lectura publica de talles"
  on talles for select
  to anon
  using (
    exists (select 1 from productos p where p.id = talles.producto_id and p.activo = true)
  );

drop policy if exists "lectura completa de talles autenticada" on talles;
create policy "lectura completa de talles autenticada"
  on talles for select
  to authenticated
  using (true);

-- Escritura: solo usuarias autenticadas ---------------------------------------
--
-- No hay registro público (se desactiva en Authentication > Providers), así que
-- "authenticated" significa las cuentas dadas de alta a mano desde el panel.

drop policy if exists "escritura autenticada de categorias" on categorias;
create policy "escritura autenticada de categorias"
  on categorias for all
  to authenticated
  using (true) with check (true);

drop policy if exists "escritura autenticada de subcategorias" on subcategorias;
create policy "escritura autenticada de subcategorias"
  on subcategorias for all
  to authenticated
  using (true) with check (true);

drop policy if exists "escritura autenticada de productos" on productos;
create policy "escritura autenticada de productos"
  on productos for all
  to authenticated
  using (true) with check (true);

drop policy if exists "escritura autenticada de talles" on talles;
create policy "escritura autenticada de talles"
  on talles for all
  to authenticated
  using (true) with check (true);

-- ----------------------------------------------------------------------------
-- Storage: bucket de fotos
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('prendas', 'prendas', true)
on conflict (id) do nothing;

drop policy if exists "lectura publica de fotos" on storage.objects;
create policy "lectura publica de fotos"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'prendas');

drop policy if exists "subida autenticada de fotos" on storage.objects;
create policy "subida autenticada de fotos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'prendas');

drop policy if exists "borrado autenticado de fotos" on storage.objects;
create policy "borrado autenticado de fotos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'prendas');

drop policy if exists "actualizacion autenticada de fotos" on storage.objects;
create policy "actualizacion autenticada de fotos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'prendas');
