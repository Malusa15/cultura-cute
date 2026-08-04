# Cultura.Cute

Sitio público de la marca: portfolio + vidriera de venta. Las compras no se cierran
en la página: se arma un carrito y "Finalizar compra" abre WhatsApp con el pedido escrito.

## Correr el proyecto

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # genera dist/
npm run preview  # sirve dist/ para probar el build
```

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

Las opciones de los filtros (categorías, colores, estilos, talles, rango de precio)
se derivan solas del catálogo, así que al cargar un producto con una categoría nueva
el filtro aparece sin tocar nada más.

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
