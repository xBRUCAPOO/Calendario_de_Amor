# Fechas Importantes

App mobile-first (pensada para Android, medida sobre un Motorola G72) para
llevar un calendario de días especiales: cumpleaños, aniversarios, fechas de
pareja, feriados y cualquier otra fecha que quieras que no se te pase.

Tema oscuro, escala de negros/grises/blancos, con color solo en los días
especiales (50 colores a elegir). Funciona 100% offline con `localStorage` y,
opcionalmente, se puede conectar a un backend real con Cloudflare D1 (ver
`BACKEND-README.md`).

## Qué se puede hacer

- **Calendario** (`pages/calendario.html`): ver un mes con los días especiales
  marcados de color, navegar entre meses (recuerda en qué mes te quedaste),
  ver cuántos eventos hay en un mismo día ("+N"), y tocar un día para ir
  directo a su detalle en Fechas.
- **Fechas** (`pages/fechas.html`): lista ordenada por cercanía, buscador por
  nombre, filtro por categoría (Pareja / Cumpleaños / Aniversario / Otro), y
  un switch separado para ver solo los Feriados. Cada tarjeta se puede
  compartir, editar o borrar, y tocarla abre un menú flotante con el detalle
  completo (nombre, fecha, cuenta regresiva, categoría y descripción).
- **Agregar/editar un día**: fecha (con switch para "se repite todos los
  años" o "fecha puntual con año"), nombre, categoría, recordatorio en días
  antes, descripción (admite `**palabra**` para resaltarla del color del día
  y `[texto](url)` para links) y un color entre 50 (los feriados no eligen
  color: siempre se muestran en gris claro).
- **Notificaciones locales**: botón de campanita en la home para activar
  avisos del navegador según el "avisarme X días antes" de cada fecha.
- **PWA**: se puede instalar ("agregar a pantalla de inicio") y funciona
  offline gracias al service worker.
- **Feriados precargados**: los feriados nacionales de Argentina + el propio
  de Córdoba Capital (6 de julio), y algunas fechas de pareja conocidas (San
  Valentín, Día de la Novia, etc.) — todo esto se puede editar o borrar como
  cualquier otro día.

## Estructura del proyecto

```
/
├── index.html            → pantalla de inicio (3 accesos + banner "hoy")
├── manifest.json         → configuración de la PWA
├── service-worker.js     → cachea la app para que funcione offline
├── wrangler.toml         → config del binding de D1 (backend opcional)
├── schema.sql            → esquema de la base D1 (backend opcional)
├── BACKEND-README.md     → cómo conectar el backend con Cloudflare D1
├── css/
│   └── style.css         → TODO el diseño: colores, tipografías e íconos
│                            se definen como variables en :root
├── js/
│   ├── common.js         → datos (API + localStorage), fechas, modal de
│   │                        agregar/editar, menú de detalle, diálogos propios
│   ├── notifications.js  → permiso y chequeo de recordatorios locales
│   ├── index.js          → lógica de la home (banner "hoy")
│   ├── calendario.js     → lógica del calendario
│   └── fechas.js         → lógica de la lista de fechas
├── icons/                → íconos de la PWA (192px y 512px)
└── functions/api/        → backend opcional (Cloudflare Pages Functions + D1)
```

## Cómo probarlo

Sin backend ni servidor: abrí `index.html` directo en el navegador (doble
clic). Todo funciona con `localStorage`, incluida la carga inicial de
feriados y fechas de pareja de ejemplo.

Para desplegarlo de verdad (con o sin backend), subí toda esta carpeta a
Cloudflare Pages tal cual está. Si además querés que las fechas se guarden en
una base de datos real (D1) en vez de solo en el celular, seguí los pasos de
`BACKEND-README.md` — es opcional, la app funciona igual sin eso.

## Convenciones de diseño (por si se sigue modificando)

- **Colores**: todos viven en `:root` en `css/style.css`. Hay una paleta base
  en escala de grises (`--gray-*`) usada para toda la interfaz, y 50
  variables `--special-color-1` a `--special-color-50` que son el único
  lugar donde aparece color, reservadas para marcar días especiales.
- **Tipografías**: `--font-heading` (Nunito, texto general) y `--font-mono`
  (DM Mono, números/fechas/contadores), cargadas desde Google Fonts.
- **Íconos**: Material Symbols Outlined (Google Fonts Icons), nunca SVGs
  sueltos ni otra librería de íconos.
- **Cache-busting**: cada archivo `.css`/`.js` se referencia con `?v=N`. Al
  modificar alguno hay que subir ese número en **todos** los HTML que lo
  cargan (si no, el celular puede seguir usando la versión vieja en caché).
- **`index.html`**: cada vez que se modifica, se le sube la versión y la
  fecha del pie de página.

## Limitaciones conocidas

- Las notificaciones son **locales** (requieren que la app se haya abierto
  ese día); no hay push real con la app cerrada — eso necesitaría un backend
  con VAPID + una tarea programada, que no está incluido.
- Los feriados "trasladables" y los "puentes turísticos" de Argentina se
  fijan por decreto cada año, así que los que vienen cargados son
  específicos de 2026; para 2027 hay que cargar las fechas nuevas a mano
  cuando se confirmen.
