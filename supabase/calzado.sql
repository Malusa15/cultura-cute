-- ============================================================================
-- Cultura.Cute — la categoría Calzado
--
-- Se corre una sola vez, desde el SQL Editor del panel de Supabase, DESPUÉS de
-- schema.sql. Es idempotente: se puede volver a ejecutar sin romper nada.
--
-- El calzado NO es una sección aparte: es una categoría más del catálogo. Se
-- carga desde la misma solapa Prendas, con fotos, precio, costo y stock por
-- talle, y por eso aparece solo en la tienda, tiene su link para compartir,
-- entra en los avisos de stock bajo y cuenta en Economía. La única diferencia
-- es que se numera en vez de tallarse con letras, y de eso se encarga el
-- formulario (ver `tallesSugeridos` en src/data/taxonomia.js).
--
-- Esta misma lista está declarada en src/data/taxonomia.js, que es de donde
-- salen los filtros de la tienda. Las dos tienen que coincidir: la base es lo
-- que se puede elegir al cargar una prenda, y la taxonomía es lo que se puede
-- filtrar al comprarla.
-- ============================================================================

-- `orden` 6 la deja entre Accesorios (5) y Cuties, que va último porque son los
-- pedidos especiales y no una categoría de vidriera.
insert into categorias (nombre, orden)
select 'Calzado', 6
where not exists (select 1 from categorias where nombre = 'Calzado');

update categorias set orden = 7 where nombre = 'Cuties';

-- Las variedades. El `where not exists` mira el nombre dentro de esa categoría,
-- así que volver a correr el archivo no duplica ninguna, y si se borra una desde
-- el panel y se vuelve a correr, se restaura.
insert into subcategorias (categoria_id, nombre, orden)
select c.id, v.nombre, v.orden
from categorias c
cross join (values
  ('Sandalias',  1),
  ('Tacos',      2),
  ('Botas',      3),
  ('Botinetas',  4),
  ('Zapatillas', 5),
  ('Chatitas',   6)
) as v(nombre, orden)
where c.nombre = 'Calzado'
  and not exists (
    select 1 from subcategorias s
    where s.categoria_id = c.id and s.nombre = v.nombre
  );
