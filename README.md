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

Hoy el sitio se publica en **los dos lados a la vez**, mientras dura la mudanza a Vercel:

| | GitHub Pages | Vercel |
|---|---|---|
| URL | `malusa15.github.io/cultura-cute/` | la de `.vercel.app` |
| Qué lo dispara | `.github/workflows/deploy.yml` en cada push a `main` | cada push a `main` |
| `base` de Vite | `/cultura-cute/` | `/` |
| Rutas tipo `/admin` | el truco de `public/404.html` | el rewrite de `vercel.json` |

`vite.config.js` elige el `base` según `process.env.VERCEL`, que Vercel define solo en
sus builds. Por eso los dos deploys conviven sin pisarse y el sitio viejo sigue
funcionando hasta que se decida apagarlo.

Vite aplica el prefijo del `base` en el HTML y el CSS, pero **no** dentro de strings de
JavaScript, así que las rutas a `public/` que viven en el código (fotos, logos) pasan
por el helper `asset()` de `src/lib/rutas.js`. `fotoUrl()` además saca un `/cultura-cute`
guardado en la base: en Vercel el sitio cuelga de la raíz y una foto cargada en la época
de Pages quedaría rota.

### Terminar la mudanza a Vercel

Lo que falta hacer **desde la web de Vercel** (son acciones de cuenta):

1. Entrar a [vercel.com](https://vercel.com) con la cuenta de GitHub.
2. *Add New… → Project* e importar el repo `Malusa15/cultura-cute`. Detecta Vite solo;
   `vercel.json` se encarga del resto.
3. **Antes de darle Deploy**, cargar las dos variables de entorno (están en `.env.local`):
   `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Sin eso el panel arranca sin base.
4. Deploy, y probar la URL `.vercel.app` que queda: la tienda, `/admin` y una foto.

Después, cuando esté andando:

- **Dominio propio**: se registra y se apunta desde *Settings → Domains* de Vercel. Esto
  es lo que quedó pendiente con GitHub Pages, donde el dominio hay que sostenerlo con un
  archivo `CNAME` que cada deploy pisa.
- En Supabase, *Authentication → URL Configuration*, poner el dominio nuevo como **Site
  URL** para que los mails de recuperación de contraseña apunten bien.
- Recién ahí, apagar GitHub Pages: borrar `.github/workflows/deploy.yml` y `public/404.html`,
  y dejar `base: '/'` fijo en `vite.config.js`.

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

## Formulario de prendas a pedido

La tarjeta **Prendas a pedido** baja a `#a-medida` (`src/components/PedidoAMedida.jsx`).
Se elige qué tipo de pedido es —una pieza exclusiva de la marca, un diseño que vio y
quiere reversionado, o uno nuestro con cambios de talle/color/tela/detalles—, qué prenda
y los datos de la clienta.

A diferencia del de personalización, **este sí escribe en la base**: deja un presupuesto
en `borrador` con `origen = 'web'`, así aparece en la solapa Presupuestos listo para
ponerle precio en vez de cargarlo a mano. El mensaje de WhatsApp lleva el número
(«presupuesto #12») para encontrarlo.

La tienda no tiene sesión, así que entra como `anon`. En vez de darle INSERT sobre
`presupuestos` —que le dejaría inventar totales o marcar presupuestos como aceptados— se
le da acceso a una sola función `security definer`, igual que `registrar_pedido` del
carrito. Todo lo que es plata se fuerza en cero adentro de la función: del navegador solo
se acepta texto, y con topes de largo. Está en `supabase/pedidos-a-medida.sql`.

Si la base falla o el SQL todavía no se corrió, el formulario abre WhatsApp igual con el
mensaje completo, solo que sin número: perder el registro es molesto, perder el pedido es
peor. Por lo mismo, `traerPresupuestos` pide las columnas con `*` y no por nombre — si
pidiera `origen` explícitamente, la solapa entera se caería hasta correr ese SQL.

Las medidas del cuerpo no se piden acá: son veinte campos y espantan a cualquiera en un
formulario público. Se toman después por chat o en persona y se cargan en el panel.

## Formulario de personalización

La tarjeta **Personalización** de Servicios no abre WhatsApp: baja a la sección
`#personalizacion` de la misma home (`src/components/Personalizacion.jsx`). Ahí se elige
qué prenda es, hasta dónde intervenirla (talle y estilo / solo el estilo / diseño
completo), qué apliques sumarle y los datos de la clienta. Recién al final se abre el
chat, ya con todo escrito.

La casilla **Personalización Cutie** apaga los pasos 2 y 3: la clienta elige la prenda y
la marca decide cómo intervenirla. Los pasos se deshabilitan (`disabled` en el fieldset)
en vez de esconderse, así se ve qué se está delegando, y lo que hubiera marcado sigue
ahí si se arrepiente y destilda. Los datos de contacto nunca se apagan: sin nombre no se
puede contestar.

Igual que el de prendas a pedido, deja un presupuesto en borrador en el panel. Usa la
**misma** función `registrar_pedido_a_medida`: para la base son lo mismo —una consulta
que hay que cotizar—, y lo que las distingue es la primera línea de la descripción
(«Personalización: …» contra «Un diseño exclusivo…»). Esa línea se muestra en la lista de
Presupuestos, así se sabe de qué se trata cada una sin abrirlas.

Reusar la función tiene una ventaja concreta: no hubo que correr SQL nuevo para
conectarlo. La idea es que la consulta llegue
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

## Economía

La solapa **Economía** del panel lleva la plata de la marca: cada vez que entra o sale
algo se carga un movimiento en una caja.

Las cajas son dos, y arrancan creadas:

- **Caja chica** — el efectivo del día a día (una tela, el flete, el packaging).
- **Caja grande** — el fondo de la marca (lo que se guarda, la cuenta, el banco).

Se pueden agregar más desde el botón *Cajas* (Mercado Pago, una cuenta aparte). El
**saldo inicial** de cada una es lo que había adentro el día que se empezó a anotar: sin
eso el saldo arrancaría en cero y nunca coincidiría con la plata real.

Cada movimiento tiene un **tipo**, y el tipo ya sabe para qué lado va la plata:

| Entra | Sale | Depende |
|---|---|---|
| Cobro de venta · Otro ingreso · Aporte de plata | Gasto · Sueldo · Pago a proveedor · Retiro | Ajuste de caja |

Los **sueldos** se cargan como un movimiento de tipo Sueldo con el nombre de la persona
en *A quién*. Los **gastos** y los **pagos** llevan además un **rubro** (telas, alquiler,
envíos, publicidad…), que es lo que después arma el bloque *En qué se fue*. El
**Cobro de venta** se puede atar a una venta del panel: al elegirla se completan solos el
monto, el concepto y el nombre de la clienta.

El **traspaso entre cajas** tiene su propio botón porque escribe dos renglones a la vez
—la salida de una caja y la entrada en la otra— y los guarda atados: borrar uno se lleva
el otro, porque una pata suelta descuadraría las dos cajas. Los traspasos **no cuentan**
en el *entró / salió / quedó* del mes: esa plata no entró ni salió, cambió de bolsillo.

Los saldos de arriba se calculan siempre sobre todo lo cargado, aunque estés mirando un
mes: el saldo de una caja es uno solo. Si no coincide con la plata real, se corrige con un
movimiento de tipo **Ajuste de caja**, que es el único que deja elegir el lado.

### Lo que evita cargar todo dos veces

Una venta se cierra en su solapa, la seña se anota en el encargo y el costo del envío en el
suyo. Sin nada que los una, Economía no se entera, y el agujero más grande de una caja no es
un número mal puesto: es olvidarse de cargarlo.

Por eso arriba de todo aparece **Plata que falta registrar**: lo que ya está anotado en otra
solapa y todavía no pasó por ninguna caja. Se destilda lo que no corresponda y se cargan
todas juntas en la caja que se elija. El vínculo (`venta_id`, `encargo_id`, `envio_id`) es lo
que hace que después desaparezcan de la lista, así no se cargan dos veces.

Los dos últimos los agrega la parte final de `economia.sql` con `add column if not exists`,
o sea que **volver a correr el mismo archivo alcanza**. Hasta que se corra, la lista muestra
solo las ventas y lo dice: `traerEconomia` pregunta por la columna antes de usarla y, si no
está, ni la menciona en el insert — nombrar una columna inexistente haría fallar el guardado
entero, y cargar un gasto no puede depender de un SQL que todavía no se corrió.

### El resto de la solapa

- **Repetir** en cada movimiento lo vuelve a cargar con la fecha corrida un mes, para los
  gastos fijos (alquiler, internet, dominio). Si el día no existe en el mes destino se usa el
  último: el 31 de enero cae el 28 de febrero.
- **Cómo venís mes a mes**: los últimos seis meses con barras a la misma escala. Los meses
  vacíos se muestran en cero en vez de saltarse; si desaparecieran, la seguidilla mentiría.
- **Qué prendas se vendieron**: unidades y facturado por prenda. El costo sale del
  presupuesto que tenga ese mismo nombre de prenda (comparado sin mayúsculas ni acentos),
  que es el único lugar del panel donde se anota lo que cuesta hacer algo. Las prendas del
  catálogo no tienen costo cargado en ninguna parte, así que de esas se ve lo que entró y no
  lo que dejaron.
- **Contar la caja**: se escribe cuánta plata hay de verdad y el panel arma solo el ajuste.
  Si da justo no carga nada, en vez de un movimiento de cero pesos.
- **Bajar a Excel**: CSV de lo que esté en pantalla, con `;` como separador y coma decimal
  —que es lo que espera el Excel en castellano— y un BOM al principio para que no rompa los
  acentos. El monto va con signo para poder sumar la columna derecho.

Los montos se muestran con `plata()` y no con el `precio()` de la tienda: ese redondea al
peso, y un gasto de $1.234,50 se veía "$1.235" mientras el saldo usaba el número exacto. Acá
los centavos aparecen solo cuando existen.

| Archivo | Qué hace |
|---|---|
| `supabase/economia.sql` | Tablas `cajas` y `movimientos`, las dos cajas iniciales, los enganches y RLS |
| `src/lib/economia.js` | Tipos, rubros, las cuentas, los pendientes, el CSV y el acceso a la base |
| `src/admin/Economia.jsx` | La solapa del panel |

Los montos se guardan **siempre positivos** y el signo lo pone la columna `direccion`: un
gasto cargado con el monto en negativo sumaría en vez de restar. Todo es una sola tabla y
no una por concepto (gastos, sueldos, pagos…) porque el saldo de una caja es la suma de
sus renglones, y con cinco tablas habría que sumar cinco listas sin perder ninguna.

Es lo más privado del proyecto —cuánto entra, cuánto se gasta, cuánto cobra cada
persona—, así que `anon` no lee nada, ni siquiera los nombres de las cajas.

## El link propio de cada prenda

Cada prenda tiene su dirección: `/prenda/corset-azul-satinado-fa3d5560`. Sirve para mandar
por WhatsApp el link de **una** prenda, y para que Google las indexe una por una en vez de
ver una sola página con todo adentro.

**El link lleva el nombre y además un pedazo del id, y para encontrar la prenda se usa solo
el id.** El nombre es decorado: hace que el link se entienda al leerlo y le da a Google
palabras con las que encontrarla. Si el nombre dependiera de verdad, corregir una falta de
ortografía rompería todos los links ya compartidos. Ocho caracteres del uuid son 4.300
millones de combinaciones — no chocan.

**Qué prenda está abierta lo dice la dirección**, no un estado de React. Así el link que se
comparte y lo que se ve no pueden discrepar, entrar de cero a un link abre la misma ficha
que hacer clic, y el botón *atrás* del navegador cierra la ficha solo. Si la prenda ya no
existe o se ocultó, manda a la tienda.

Las tarjetas son `<Link>` y no `<button>`: un link de verdad lo sigue Google y se puede
abrir en otra pestaña con Ctrl+clic. El clic normal lo intercepta React y no recarga nada.

### Por qué hace falta `api/prenda.js`

**WhatsApp, Instagram y Facebook no ejecutan JavaScript.** Piden la página y leen el
encabezado del HTML. Para ellos la tienda es un archivo casi vacío, así que sin esto el
link de un corset mostraba exactamente la misma vista previa que el link de la home.

La función intercepta solo `/prenda/…`, busca la prenda y reescribe título, descripción,
`og:image` y `canonical` **sobre el `index.html` de siempre**, que pide por HTTP. Se toca
la plantilla que ya existe en vez de mantener una copia acá: dos plantillas se separan sola
con el tiempo. Agrega además el `application/ld+json` de tipo `Product`, que es lo que le
permite a Google mostrar precio y disponibilidad en los resultados.

La dirección canónica se arma desde los datos de la prenda y no se copia la que pidió el
visitante: como el texto del link no importa, sin esto Google indexaría la misma prenda
tantas veces como formas de escribirla haya. Una prenda que no existe devuelve 404 con la
página normal, así el buscador no se guarda algo que ya no está.

`/sitemap.xml` (`api/sitemap.js`) se arma en el momento leyendo el catálogo, así una prenda
nueva aparece sin volver a publicar el sitio. `public/robots.txt` lo anuncia y deja
`/admin` afuera de los buscadores.

Ojo con el orden de los `rewrites` en `vercel.json`: `/prenda/(.*)` y `/sitemap.xml` van
**antes** del comodín que manda todo al `index.html`, porque gana el primero que coincide.

## Estadísticas de visitas

La solapa **Estadísticas** del panel cuenta quién entra a la tienda: cuántas visitas y
cuántas personas distintas, de qué país y ciudad, con qué aparato, por dónde llegaron
(Instagram, Google, WhatsApp, directo) y cuánto se quedaron en cada sección.

**Quién entró no se puede saber, y no es una limitación del sitio.** No se guarda ninguna
IP, ningún nombre y ninguna cookie. Lo que identifica una visita es un hash de
IP + navegador + **la fecha de hoy** + una sal secreta: alcanza para no contar diez veces
a la misma persona el mismo día, y como la fecha entra en la mezcla, mañana esa misma
persona genera otro código. No se puede volver del código a la IP ni seguir a nadie de un
día para el otro. De quienes **compran** sí se sabe el nombre, porque lo dejan en el
pedido, y eso vive en Ventas.

Como no hay cookies ni almacenamiento persistente en el navegador de quien visita, **el
sitio no necesita el cartel de cookies**. Se respeta además la opción «no rastrear» del
navegador, y el panel `/admin` no se mide: son las visitas de la marca a sí misma.

### Por qué hay una función de servidor

El país y la ciudad salen de la IP, y la IP el navegador no la conoce: la ve el servidor.
Vercel la resuelve y agrega el resultado como cabeceras (`x-vercel-ip-country`,
`x-vercel-ip-city`), así que **`api/visita.js` es el único lugar del proyecto donde esa
información existe** — y también el único por donde pasa la IP, que se usa para el hash y
se tira. Nunca se guarda ni se registra en ningún log.

Esa función llama a `registrar_visita`, una función `security definer` de Postgres, con la
anon key. Es el mismo patrón que `registrar_pedido` del carrito: en vez de darle INSERT a
`anon` sobre las tablas, se le da acceso a una sola función que recorta todo lo que entra
(largos de texto, y un tope de ocho horas para que una pestaña olvidada abierta toda la
noche no figure como que alguien miró la tienda durante nueve horas).

Ojo con `vercel.json`: el rewrite que manda todo al `index.html` lleva `(?!api/)` para no
tragarse la función. Sin eso, `/api/visita` nunca se ejecutaría.

### Cómo se mide el tiempo por sección

`src/lib/analitica.js` observa los `<section id>` con un `IntersectionObserver` y, una vez
por segundo, le suma un segundo **a la sección que más pantalla ocupa en ese momento, y
solo a esa**. Si se le sumara a todas las visibles, una pantalla grande que muestra tres
secciones a la vez daría el triple de tiempo del que pasó. El reloj se frena cuando la
pestaña queda en segundo plano.

El aviso final va con `navigator.sendBeacon` y en el evento `pagehide`, no en `unload`:
`unload` no se dispara de forma confiable en los navegadores de celular, que son la
mayoría de las visitas. La visita se anota dos veces —una al entrar y otra al salir, con
el tiempo ya medido— y la base se queda siempre con el tiempo mayor, así que reenviar no
duplica ni achica nada.

| Archivo | Qué hace |
|---|---|
| `supabase/estadisticas.sql` | Tablas `visitas` y `visita_secciones`, la función `registrar_visita` y RLS |
| `api/visita.js` | Función de Vercel: resuelve país y ciudad, arma el código de visitante |
| `src/lib/analitica.js` | Lo que mide desde la tienda |
| `src/lib/estadisticas.js` | Las cuentas y la lectura para el panel |
| `src/admin/Estadisticas.jsx` | La solapa del panel |

### Vercel Web Analytics

Además está `@vercel/analytics`, que cuenta las mismas visitas por su lado y las muestra en
el panel de Vercel. Hay que **activarlo una vez** desde *Analytics → Enable* en el proyecto
de Vercel. Sirve de segunda opinión: los números nunca dan idénticos porque cada uno cuenta
de una manera, pero tienen que parecerse.

## Avisos: pedidos y stock

**Cuando entra un pedido del carrito llega un mail.** Antes el pedido caía en la base y
había que abrir el panel para enterarse. Ahora la tienda avisa a `api/aviso-pedido.js`
apenas queda guardado, y esa función arma el correo con el detalle, el total y un link al
panel. Sale de `pedidos@culturacute.com.ar` por **Resend**, instalado desde el Marketplace
de Vercel; como el DNS del dominio está delegado a Vercel, los registros de SPF y DKIM se
configuraron solos y el dominio quedó verificado. Contestar el mail le escribe a la
clienta.

El aviso se dispara **después** de que el pedido ya se guardó y sin esperar la respuesta:
si el mail falla, la compra sigue igual. Va con `keepalive` porque enseguida se salta a
WhatsApp y si no el navegador cancelaría la petición.

La función necesita leer el pedido para poder contarlo, y las ventas están cerradas a quien
no tiene sesión. La puerta angosta es `resumen_de_venta` (`supabase/aviso-pedidos.sql`):
devuelve **un solo pedido y solo si entró hace menos de quince minutos**. Sin ese límite,
cualquiera con el id de una venta podría sacar el nombre y el teléfono de esa clienta para
siempre.

**Arriba de la lista de Prendas se avisa qué se está por agotar.** Agrupado por prenda y no
por talle: las tandas son chicas, así que por talle serían veinte renglones y no se leería
ninguno. Primero las que no se pueden comprar en ningún talle —esas están publicadas y
nadie se las puede llevar—, después las que menos unidades tienen. El umbral arranca en
"queda 1 o menos"; con el stock actual, avisar desde 2 marca nueve de nueve prendas y el
aviso deja de servir. La cuenta está en `alertasDeStock`, en `src/lib/stock.js`.

## Respaldo

La solapa **Respaldo** baja un archivo con todas las tablas de la base. Se piden de a mil
filas hasta que no venga nada más: sin eso, el día que haya más de mil visitas el respaldo
se llevaría solo las primeras mil sin avisar. Si una tabla falla se anota y sigue con las
demás — es mejor un respaldo de catorce tablas que ninguno.

No incluye las fotos de las prendas y no hace falta: hoy son archivos del repositorio, así
que ya están guardadas con el código. Restaurar no se hace desde el panel a propósito:
sobrescribir una base es de las pocas cosas que no tienen vuelta atrás.

## Cuánto deja cada prenda

`productos.costo` guarda lo que cuesta producir una unidad, y se carga desde el formulario
de la prenda. Con eso, el bloque *Qué prendas se vendieron* de Economía pasa de decir
cuánto **entró** a decir cuánto **dejó**. El costo se busca en dos lados y en este orden:
el campo de la prenda primero, y si no está, un presupuesto que se llame igual (comparando
sin mayúsculas ni acentos). Si no hay ninguno de los dos queda en blanco: es preferible a
inventar un margen.

La columna la agrega la parte final de `economia.sql`, que se corre a mano, así que el
código está escrito para aguantar el hueco. Dos medidas concretas: `SELECT_PRODUCTO` pide
las columnas con `*` —pidiendo `costo` por nombre, la tienda entera se caería hasta correr
el SQL— y `guardarProducto` pregunta una vez por sesión si la columna existe antes de
mencionarla, porque nombrar una columna inexistente hace fallar el guardado entero y cargar
una prenda no puede depender de un SQL pendiente.

## Qué descarga quien entra a la tienda

El panel se carga aparte, con `lazy()`, y `admin.css` se importa desde `Admin.jsx` en vez
de `main.jsx` para que los estilos viajen en el mismo pedazo. Antes, quien entraba a mirar
prendas se bajaba también las diez solapas del panel.

| | Código | Estilos | Total |
|---|---|---|---|
| Antes | 166 KB | 8 KB | **174 KB** |
| Ahora | 139 KB | 5 KB | **144 KB** |

Los 32 KB del panel se bajan recién al abrir `/admin`. El cartel de «Cargando el panel»
lleva los estilos escritos adentro y no en una clase: la hoja del panel viaja con el panel,
así que con una clase aparecería sin formato justo cuando se lo ve.

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
   `supabase/ventas.sql`, `supabase/presupuestos.sql`, `supabase/pedidos-a-medida.sql`,
   `supabase/economia.sql`, `supabase/estadisticas.sql` y `supabase/aviso-pedidos.sql`. Los ocho son idempotentes: si se
   corren dos veces no rompen nada.
3. En **Authentication > Providers**, desactivar el registro público y dar de alta
   a mano las cuentas que van a entrar al panel.
4. Copiar `.env.example` a `.env.local` y completar la URL y la anon key.
