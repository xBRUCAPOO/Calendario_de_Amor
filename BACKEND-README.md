# Backend (Cloudflare D1 + Pages Functions)

La app funciona igual sin este paso (todo se guarda en el celular con
`localStorage`), pero si querés que las fechas se guarden en un backend real
y se puedan sincronizar entre dispositivos, seguí estos pasos.

## 1) Crear la base D1

```
npx wrangler d1 create fechas_importantes_db
```

Esto te devuelve un `database_id`. Copialo en `wrangler.toml`, reemplazando
`REEMPLAZAR_CON_TU_DATABASE_ID`.

## 2) Crear la tabla

```
npx wrangler d1 execute fechas_importantes_db --file=schema.sql --remote
```

(Para probar en local antes de subir, corré el mismo comando sin `--remote`.)

## 3) Conectar la base al proyecto de Pages

Si ya tenés el proyecto de Pages creado (como en tus otros proyectos con
Cloudflare Pages):

- Panel de Cloudflare → tu proyecto de Pages → **Settings → Functions → D1
  database bindings** → Add binding:
  - Variable name: `DB`
  - D1 database: `fechas_importantes_db`

Con eso alcanza — no hace falta tocar nada más en el código, las funciones en
`functions/api/` ya están escritas para usar `env.DB`.

## 4) Deploy

Subiendo la carpeta completa (con `functions/`) a tu repo/Cloudflare Pages
como siempre. Cloudflare detecta la carpeta `functions/` sola y las
convierte en endpoints:

- `GET  /api/days`
- `POST /api/days`
- `PUT  /api/days/:id`
- `DELETE /api/days/:id`

## Cómo conviven D1 y el modo offline

`common.js` intenta primero pegarle a `/api/days`. Si no hay conexión (o
todavía no desplegaste el backend), usa la última copia guardada en
`localStorage` y anota el cambio en una cola pendiente que se reintenta sola
apenas vuelve la conexión (`flushPendingQueue`, ver `common.js`). No hace
falta ninguna configuración extra para esto.
