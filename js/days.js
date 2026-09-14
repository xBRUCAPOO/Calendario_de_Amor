/* ==========================================================================
   FECHAS IMPORTANTES — functions/api/days.js
   Cloudflare Pages Function. Maneja:
   - GET  /api/days   -> lista todos los días especiales guardados en D1
   - POST /api/days   -> crea un día especial nuevo
   El binding "DB" (env.DB) se configura en el panel de Cloudflare Pages
   (Settings > Functions > D1 database bindings) o en wrangler.toml.
   ========================================================================== */

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Convierte una fila de la tabla (SQLite guarda booleans como 0/1) al formato
// que espera el frontend (recurring: true/false).
function rowToDay(row) {
  return {
    id: row.id,
    day: row.day,
    month: row.month,
    year: row.year,
    recurring: !!row.recurring,
    name: row.name,
    description: row.description,
    colorIndex: row.colorIndex,
    category: row.category,
    remindDaysBefore: row.remindDaysBefore,
    // NUEVO: día/mes de fin para días de varios días (ej. Semana de la
    // Dulzura). NULL en el resto.
    endDay: row.endDay,
    endMonth: row.endMonth,
  };
}

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM special_days ORDER BY month, day'
  ).all();
  return json(results.map(rowToDay));
}

export async function onRequestPost({ request, env }) {
  const body = await request.json();
  const id = body.id || crypto.randomUUID();

  await env.DB.prepare(
    `INSERT INTO special_days (id, day, month, year, recurring, name, description, colorIndex, category, remindDaysBefore, endDay, endMonth)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    body.day,
    body.month,
    body.year ?? null,
    body.recurring ? 1 : 0,
    body.name,
    body.description ?? '',
    body.colorIndex ?? 1,
    body.category ?? 'otro',
    body.remindDaysBefore ?? null,
    body.endDay ?? null,
    body.endMonth ?? null
  ).run();

  return json({ ...body, id }, 201);
}
