-- ============================================================================
-- Arreglo puntual: rutas de fotos con el prefijo del deploy repetido
--
-- Qué pasó: el formulario del panel leía las rutas ya resueltas ("/cultura-cute/
-- img/…") y al guardar las volvía a escribir así en la base. En la lectura
-- siguiente se les sumaba otro "/cultura-cute/" y la foto daba 404.
--
-- El código ya no guarda rutas resueltas (ver `fotoUrl` en src/lib/rutas.js),
-- así que esto se corre UNA vez para limpiar lo que quedó mal guardado.
-- Se corre desde el SQL Editor del panel de Supabase.
-- ============================================================================

-- 1) Antes de tocar nada: ver qué filas están afectadas y cómo quedarían.
select
  p.id,
  p.nombre,
  p.imagenes as antes,
  array(
    select regexp_replace(img, '^(/cultura-cute)+/', '/')
    from unnest(p.imagenes) with ordinality as t(img, pos)
    order by t.pos
  ) as despues
from productos p
where exists (
  select 1 from unnest(p.imagenes) as img where img like '/cultura-cute/%'
);

-- 2) Si el listado de arriba se ve bien, aplicar. Solo toca las filas que
--    cambian, y `array(... order by pos)` conserva el orden de las fotos
--    (que importa: la primera es la que se muestra en la tienda).
update productos p
set imagenes = array(
  select regexp_replace(img, '^(/cultura-cute)+/', '/')
  from unnest(p.imagenes) with ordinality as t(img, pos)
  order by t.pos
)
where exists (
  select 1 from unnest(p.imagenes) as img where img like '/cultura-cute/%'
);

-- 3) Control: tiene que devolver 0 filas.
select p.id, p.nombre, p.imagenes
from productos p
where exists (
  select 1 from unnest(p.imagenes) as img where img like '/cultura-cute/%'
);
