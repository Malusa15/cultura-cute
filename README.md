# Cultura.Cute

**Online en → https://malusa15.github.io/cultura-cute/**

Sitio público de la marca: portfolio + vidriera de venta. Las compras no se cierran
en la página: se arma un carrito y "Finalizar compra" abre WhatsApp con el pedido escrito.

## Correr el proyecto

```bash
npm install
npm run dev      # http://localhost:5173/cultura-cute/
npm run build    # genera dist/
npm run preview  # sirve dist/ para probar el build
```

Ojo con la ruta de `dev`: el sitio cuelga de `/cultura-cute/` y no de la raíz
(ver *Publicación*). Entrar a `localhost:5173` a secas redirige solo.

## Publicación

Cada push a `main` dispara `.github/workflows/deploy.yml`, que buildea y publica en
GitHub Pages. No hay que hacer nada a mano.

Como Pages sirve el sitio desde un subdirectorio, `vite.config.js` define
`base: '/cultura-cute/'`. Vite aplica ese prefijo en el HTML y el CSS, pero **no**
dentro de strings de JavaScript, así que las rutas a `public/` que viven en el código
(fotos de productos, logos) pasan por el helper `asset()` de `src/lib/rutas.js`.
Si alguna vez se mueve a un dominio propio, alcanza con cambiar `base` y actualizar
las meta de Open Graph en `index.html`.

Requiere Node 18+ (instalado: v24).

## Stack

React 18 + Vite, CSS plano con variables. Sin dependencias de UI: los iconos son SVG
en línea y el carrusel, los filtros y el carrito están escritos a mano. Todavía no hay
Supabase — el catálogo sale de un archivo (ver *Pendiente*).

## Estructura

```
public/img/
  productos/    fotos del catálogo (extraídas del portfolio 2026)
  editorial/    fotos de producción, para hero / sobre nosotras / contacto
  marca/        wordmark.png y monograma-cc.png (PNG transparentes)
src/
  data/marca.js       textos de marca, contacto, servicios, navegación
  data/productos.js   catálogo + helpers de stock y opciones de filtros
  context/            carrito (estado + persistencia en localStorage)
  lib/                formato de precios y armado de links de WhatsApp
  components/         una sección por archivo
  styles/global.css   toda la hoja de estilos
```

## Identidad visual

La paleta y las tipografías salen del **portfolio 2026**, no del libro de marca viejo
(ese define negro/dorado y quedó descartado). Los hex están muestreados del PDF, no
estimados a ojo:

| Uso | Hex |
|---|---|
| Rojo (bloques, títulos) | `#A9170B` |
| Crema (fondo) | `#FFFCE8` |
| Negro | `#0A0A0A` |
| Dorado (acento) | `#C9A227` |

Tipografías (Google Fonts):

- **UnifrakturCook** — sólo el nombre de la marca en el hero. No se usa en ningún otro lado.
- **MedievalSharp** — títulos de sección, links del menú, nombres de servicios y de prendas.
- **EB Garamond** — cuerpo de texto y la franja superior del header.
- **Inter** — botones, precios, filtros y controles.

El wordmark y el monograma son los originales del portfolio: se extrajeron del PDF
recombinando la imagen con su máscara de transparencia y se recortaron los márgenes.

## Cómo cargar productos

Todo vive en `src/data/productos.js`. El stock va **por talle**: si `S` está en 0 no
se puede agregar aunque `M` tenga unidades. `activo: false` saca la prenda de la
tienda sin borrarla.

Cuidado con los dos campos de material: `materiales` es la lista de tags con la que
filtra la tienda (tienen que salir de `taxonomia.js`), y `composicion` es el texto
libre que se muestra en la ficha.

## Filtros y taxonomía

Las opciones viven en `src/data/taxonomia.js` y están organizadas en ejes separados:

| Filtro | Opciones |
|---|---|
| Categoría (principal) | Partes de arriba · Partes de abajo · Abrigos · Conjuntos · Accesorios · Cuties |
| Género | Mujer · Hombre |
| Subcategoría | Depende de la categoría elegida |
| Talle · Color | Salen del catálogo |
| Material | Jean · Piel · Cuero/Cuerina · Encaje · Satén · Punto · Algodón · Lentejuelas |
| Estilo | Y2K · Gótico · Vintage · Fiesta · Streetwear |
| Precio · Disponibilidad | — |

La taxonomía se declara a mano en vez de derivarse de los productos: si saliera de
ellos, una categoría sin prendas cargadas desaparecería del filtro.

**Todas las opciones son clickeables**, incluso las vacías. Cuando la tienda queda
sin resultados distingue dos casos:

- La categoría todavía no tiene prendas cargadas → cartel **"Próximamente"** con un
  botón para consultar por WhatsApp.
- Cada opción elegida sí tiene prendas, pero la combinación no da resultados
  (por ejemplo *Partes de arriba* + *Dorado*) → *"No hay prendas que coincidan con
  esos filtros"* con el botón de limpiar.

Esa distinción la hace `seleccionSinPrendas()` en `Tienda.jsx`.

Dos criterios de armado, para no repetir el mismo filtro dos veces:

- **"Jean" es material, no subcategoría.** Un jean se encuentra combinando
  "Partes de abajo" + "Jean", y así el mismo filtro sirve para una campera de jean.
- **Las categorías viejas** (Tops, Pantalones, Polleras, Vestidos) pasaron a ser
  subcategorías, porque "partes de arriba/abajo" ya cubre ese nivel.

## WhatsApp

El número `2235402402` se guarda como `5492235402402` en `src/data/marca.js`
(54 Argentina + 9 celular + 223 Mar del Plata sin el 0 + número sin el 15).
Cambiarlo ahí lo actualiza en todo el sitio.

## Formulario de personalización

La tarjeta **Personalización** de Servicios no abre WhatsApp: baja a la sección
`#personalizacion` de la misma home (`src/components/Personalizacion.jsx`). Ahí se elige
qué prenda es, hasta dónde intervenirla (talle y estilo / solo el estilo / diseño
completo), qué apliques sumarle y los datos de la clienta. Recién al final se abre el
chat, ya con todo escrito.

No guarda nada en la base: arma el mensaje y listo. La idea es que la consulta llegue
completa para poder cargarla derecho en la solapa Presupuestos del panel, sin el ida y
vuelta de preguntar siempre lo mismo.

Las listas de prendas, alcances y apliques están en `PERSONALIZACION`, en
`src/data/marca.js`: agregar una opción es editar esa lista y nada más. Cualquier
servicio de `SERVICIOS` que tenga `ancla` cambia su botón por uno que baja a esa
sección en vez de abrir WhatsApp.

## Presupuestos

La solapa **Presupuestos** del panel cotiza una prenda antes de que exista el encargo:
se cargan los materiales (telas, apliques, tintura, avíos), las horas de trabajo por lo
que vale la hora, un margen y un descuento opcional, y el total se calcula solo mientras
se escribe. También guarda las medidas del cuerpo de la clienta (torso, brazos, piernas
y largos de la prenda, todo en cm).

El botón **Guardar y descargar PDF** baja un A4 con la identidad de la marca —fondo
crema, wordmark, la caja roja del total— listo para mandar por WhatsApp. Se arma en el
navegador con [jsPDF](https://github.com/parallax/jsPDF), que se carga con `import()`
dinámico para que la tienda pública no lo descargue.

Un presupuesto no mueve stock ni plata: si la clienta lo acepta, se carga como encargo
en la solapa de al lado.

| Archivo | Qué hace |
|---|---|
| `supabase/presupuestos.sql` | Tablas `presupuestos` y `presupuesto_materiales` + RLS |
| `src/lib/presupuestos.js` | Listas de medidas y materiales, la cuenta del total, acceso a la base |
| `src/lib/presupuestoPdf.js` | Armado del PDF |
| `src/admin/Presupuestos.jsx` | La solapa del panel |

Las medidas se guardan en una columna `jsonb` y no en veinte columnas: son muchas, casi
siempre se llenan a medias y la lista cambia según la prenda. Las claves las define
`MEDIDAS` en `src/lib/presupuestos.js`; agregar una medida nueva es agregarla ahí y no
tocar SQL. Cambiarle la clave a una que ya se usó, en cambio, deja huérfano lo cargado.

## Pendiente

**Datos reales** (los actuales son de ejemplo, con fotos reales del portfolio):

- [ ] Nombres, precios, medidas y materiales reales de cada prenda
- [ ] Lista real de categorías y subcategorías
- [ ] Lista real de estilos/tags
- [ ] Fotos de producto propias (hoy son recortes del PDF, ~533x800 px)

**Etapa 2 — Supabase y panel admin** (en curso, rama `admin-supabase`):

Hecho:

- [x] Esquema de la base con RLS (`supabase/schema.sql`) y carga inicial (`supabase/seed.sql`)
- [x] Cliente de Supabase y capa de datos (`src/lib/supabase.js`, `src/lib/catalogo.js`)
- [x] `CatalogoContext`: la tienda lee de Supabase si hay credenciales y, si no,
      sigue andando con el catálogo local

Falta:

- [ ] Router y ruta `/admin` (con el fallback de `404.html` que necesita GitHub Pages)
- [ ] Pantalla de login con Supabase Auth y guardia de sesión
- [ ] Panel: tabla de prendas, publicar/despublicar, eliminar con confirmación
- [ ] Formulario de alta y edición con subida de fotos a Supabase Storage
- [ ] Gestión de categorías y subcategorías desde el panel
- [ ] Cargar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en el workflow de deploy

### Cómo retomar

1. Crear el proyecto en [supabase.com](https://supabase.com) (plan gratis).
2. En el SQL Editor, correr en este orden: `supabase/schema.sql`, `supabase/seed.sql`,
   `supabase/ventas.sql` y `supabase/presupuestos.sql`. Los cuatro son idempotentes:
   si se corren dos veces no rompen nada.
3. En **Authentication > Providers**, desactivar el registro público y dar de alta
   a mano las cuentas que van a entrar al panel.
4. Copiar `.env.example` a `.env.local` y completar la URL y la anon key.
