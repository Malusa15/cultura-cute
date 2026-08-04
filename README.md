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
ellos, una categoría sin prendas cargadas desaparecería del filtro. Las opciones que
todavía no tienen ninguna prenda se muestran **deshabilitadas** y se activan solas
al cargar la primera.

Dos criterios de armado, para no repetir el mismo filtro dos veces:

- **"Jean" es material, no subcategoría.** Un jean se encuentra combinando
  "Partes de abajo" + "Jean", y así el mismo filtro sirve para una campera de jean.
- **Las categorías viejas** (Tops, Pantalones, Polleras, Vestidos) pasaron a ser
  subcategorías, porque "partes de arriba/abajo" ya cubre ese nivel.

## WhatsApp

El número `2235402402` se guarda como `5492235402402` en `src/data/marca.js`
(54 Argentina + 9 celular + 223 Mar del Plata sin el 0 + número sin el 15).
Cambiarlo ahí lo actualiza en todo el sitio.

## Pendiente

**Datos reales** (los actuales son de ejemplo, con fotos reales del portfolio):

- [ ] Nombres, precios, medidas y materiales reales de cada prenda
- [ ] Lista real de categorías y subcategorías
- [ ] Lista real de estilos/tags
- [ ] Fotos de producto propias (hoy son recortes del PDF, ~533x800 px)

**Etapa 2 — Supabase y panel admin** (todavía no arrancó):

- [ ] Mover el catálogo de `productos.js` a Supabase
- [ ] Supabase Storage para las imágenes
- [ ] `/admin` con login (Supabase Auth, altas manuales, sin registro público)
- [ ] ABM de productos, stock por talle, activar/desactivar, gestión de categorías
- [ ] Definir qué cuentas tienen acceso al panel
- [ ] Deploy en Vercel o Netlify
