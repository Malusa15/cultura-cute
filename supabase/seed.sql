-- ============================================================================
-- Cultura.Cute — carga inicial
--
-- Corre después de schema.sql. Deja cargada la taxonomía completa y las 9
-- prendas de ejemplo que ya están en el sitio, para poder probar el panel con
-- datos reales antes de cargar el catálogo de verdad.
--
-- Las fotos apuntan a /img/productos/, que son las que ya viven en el repo. Las
-- prendas nuevas que subas desde el panel van a guardarse en Supabase Storage y
-- van a tener una URL completa: la tienda entiende las dos formas.
-- ============================================================================

-- Categorías -----------------------------------------------------------------

insert into categorias (nombre, descripcion, orden) values
  ('Partes de arriba', null, 1),
  ('Partes de abajo',  null, 2),
  ('Abrigos',          null, 3),
  ('Conjuntos',        null, 4),
  ('Accesorios',       null, 5),
  ('Cuties',           'Pedidos especiales', 6)
on conflict (nombre) do nothing;

-- Subcategorías --------------------------------------------------------------

insert into subcategorias (categoria_id, nombre, orden)
select c.id, s.nombre, s.orden
from categorias c
join (values
  ('Partes de arriba', 'Tops',            1),
  ('Partes de arriba', 'Musculosas',      2),
  ('Partes de arriba', 'Blusas',          3),
  ('Partes de arriba', 'Corsets',         4),
  ('Partes de arriba', 'Remeras',         5),
  ('Partes de abajo',  'Pantalones',      1),
  ('Partes de abajo',  'Polleras',        2),
  ('Partes de abajo',  'Shorts',          3),
  ('Abrigos',          'Camperas',        1),
  ('Abrigos',          'Tapados',         2),
  ('Abrigos',          'Chalecos',        3),
  ('Conjuntos',        'Dos piezas',      1),
  ('Conjuntos',        'Vestidos',        2),
  ('Conjuntos',        'Enteritos',       3),
  ('Accesorios',       'Cinturones',      1),
  ('Accesorios',       'Bolsos',          2),
  ('Accesorios',       'Joyería',         3),
  ('Cuties',           'A medida',        1),
  ('Cuties',           'Personalización', 2)
) as s(categoria, nombre, orden) on s.categoria = c.nombre
on conflict (categoria_id, nombre) do nothing;

-- Prendas --------------------------------------------------------------------

with datos as (
  select * from (values
    ('Top satinado rosa', 42000, 'Mujer', 'Partes de arriba', 'Corsets',
     'Bustier de satén con escote corazón y costuras que marcan el busto. Cierra con cierre invisible atrás y se lleva tanto solo como debajo de una campera.',
     '{"largo":"48 cm","busto":"82-92 cm","cintura":"64-74 cm"}'::jsonb,
     array['Satén'], 'Satén de poliéster, forrería de algodón', 'Rosa',
     array['Y2K','Fiesta'], array['/img/productos/top-rosa.png'], 1),

    ('Top estampado oriental', 46000, 'Mujer', 'Partes de arriba', 'Blusas',
     'Blusa sin mangas en satén estampado con dragones y fénix bordados, cuello mao y botones de alamar. Pieza única confeccionada con un corte de tela vintage: no se repite.',
     '{"largo":"52 cm","busto":"86-96 cm"}'::jsonb,
     array['Satén'], 'Rayón estampado, apliques bordados a mano', 'Crema',
     array['Y2K','Vintage'], array['/img/productos/top-oriental.png'], 2),

    ('Top gris texturado', 39000, 'Mujer', 'Partes de arriba', 'Tops',
     'Top corto tipo halter, con tiras al cuello y hebilla de corazón con strass al centro. Punto texturado con caída, elastizado en la espalda.',
     '{"largo":"32 cm","busto":"78-88 cm"}'::jsonb,
     array['Punto'], 'Punto texturado elastizado, herrería metálica', 'Gris',
     array['Y2K','Streetwear'], array['/img/productos/top-gris.png'], 3),

    ('Musculosa rayas naranja', 35000, 'Mujer', 'Partes de arriba', 'Musculosas',
     'Musculosa de rayas horizontales con lettering estampado al frente. Corte ajustado y largo corto, pensada para llevar con tiro bajo.',
     '{"largo":"38 cm","busto":"76-90 cm"}'::jsonb,
     array['Algodón'], 'Algodón elastizado', 'Naranja',
     array['Y2K','Streetwear'], array['/img/productos/musculosa-rayas.png'], 4),

    ('Pantalón flare naranja', 58000, 'Mujer', 'Partes de abajo', 'Pantalones',
     'Pantalón de tiro medio con pierna acampanada desde la rodilla. Cae largo sobre el calzado y estiliza la silueta.',
     '{"largo":"104 cm","cintura":"66-76 cm","cadera":"92-102 cm"}'::jsonb,
     array['Cuero/Cuerina'], 'Símil cuero elastizado, forrería de tricot', 'Naranja',
     array['Y2K','Vintage'], array['/img/productos/pantalon-naranja.png'], 5),

    ('Blusa encaje victoriana', 62000, 'Mujer', 'Partes de arriba', 'Blusas',
     'Blusa de encaje con cuello alto de guipur y escote profundo en V. Confección artesanal, cada cuello se arma y se cose por separado.',
     '{"largo":"56 cm","busto":"84-94 cm","cintura":"68-78 cm"}'::jsonb,
     array['Encaje'], 'Encaje de algodón, guipur, botones de nácar', 'Blanco',
     array['Gótico','Vintage'], array['/img/productos/blusa-encaje.png'], 6),

    ('Corset azul satinado', 54000, 'Mujer', 'Partes de arriba', 'Corsets',
     'Corset con ballenas y cierre metálico al frente. Estructura firme que marca la cintura, en satén con brillo suave.',
     '{"largo":"36 cm","busto":"80-90 cm","cintura":"62-72 cm"}'::jsonb,
     array['Satén'], 'Satén, ballenas de acero, cierre metálico', 'Azul',
     array['Gótico','Fiesta'], array['/img/productos/corset-azul.png'], 7),

    ('Pollera lentejuelas dorada', 48000, 'Mujer', 'Partes de abajo', 'Polleras',
     'Mini de lentejuelas cosidas sobre base elastizada. Tiro bajo y calce ajustado. Es la prenda estrella de la temporada: se hicieron pocas unidades.',
     '{"largo":"34 cm","cintura":"64-74 cm","cadera":"88-98 cm"}'::jsonb,
     array['Lentejuelas'], 'Lentejuelas doradas, base elastizada, forro de tricot', 'Dorado',
     array['Y2K','Fiesta'],
     array['/img/productos/lentejuelas-1.png','/img/productos/lentejuelas-2.png',
           '/img/productos/lentejuelas-3.png','/img/productos/lentejuelas-4.png'], 8),

    ('Set negro con cadenas', 78000, 'Mujer', 'Conjuntos', 'Dos piezas',
     'Top de satén con breteles cruzados y apliques de cadena, más pantalón al tono. Se vende como set, aunque cada pieza funciona sola.',
     '{"largo":"92 cm","busto":"80-90 cm","cintura":"64-74 cm"}'::jsonb,
     array['Satén'], 'Punto negro, herrería metálica, gasa', 'Negro',
     array['Gótico','Fiesta'], array['/img/productos/conjunto-negro.png'], 9)
  ) as t(nombre, precio, genero, categoria, subcategoria, descripcion, medidas,
         materiales, composicion, color, estilo, imagenes, orden)
)
insert into productos (nombre, precio, genero, categoria_id, subcategoria_id, descripcion,
                       medidas, materiales, composicion, color, estilo, imagenes, orden, activo)
select d.nombre, d.precio, d.genero, c.id, sc.id, d.descripcion,
       d.medidas, d.materiales, d.composicion, d.color, d.estilo, d.imagenes, d.orden, true
from datos d
join categorias c on c.nombre = d.categoria
left join subcategorias sc on sc.categoria_id = c.id and sc.nombre = d.subcategoria
where not exists (select 1 from productos p where p.nombre = d.nombre);

-- Stock por talle ------------------------------------------------------------

insert into talles (producto_id, talle, stock, orden)
select p.id, t.talle, t.stock, t.orden
from productos p
join (values
  ('Top satinado rosa',          'S', 2, 1),
  ('Top satinado rosa',          'M', 4, 2),
  ('Top satinado rosa',          'L', 1, 3),
  ('Top estampado oriental',     'Único', 1, 1),
  ('Top gris texturado',         'S', 3, 1),
  ('Top gris texturado',         'M', 2, 2),
  ('Top gris texturado',         'L', 0, 3),
  ('Musculosa rayas naranja',    'S', 4, 1),
  ('Musculosa rayas naranja',    'M', 5, 2),
  ('Musculosa rayas naranja',    'L', 2, 3),
  ('Pantalón flare naranja',     'S', 1, 1),
  ('Pantalón flare naranja',     'M', 3, 2),
  ('Pantalón flare naranja',     'L', 2, 3),
  ('Blusa encaje victoriana',    'S', 2, 1),
  ('Blusa encaje victoriana',    'M', 2, 2),
  ('Corset azul satinado',       'S', 1, 1),
  ('Corset azul satinado',       'M', 2, 2),
  ('Corset azul satinado',       'L', 1, 3),
  ('Pollera lentejuelas dorada', 'S', 2, 1),
  ('Pollera lentejuelas dorada', 'M', 3, 2),
  ('Pollera lentejuelas dorada', 'L', 0, 3),
  ('Set negro con cadenas',      'S', 0, 1),
  ('Set negro con cadenas',      'M', 0, 2),
  ('Set negro con cadenas',      'L', 0, 3)
) as t(producto, talle, stock, orden) on t.producto = p.nombre
on conflict (producto_id, talle) do nothing;
