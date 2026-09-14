/* ==========================================================================
   FECHAS IMPORTANTES — functions/api/days/[id].js
   Cloudflare Pages Function. Maneja:
   - PUT    /api/days/:id  -> actualiza un día especial existente
   - DELETE /api/days/:id  -> lo borra
   ========================================================================== */

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

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

export async function onRequestPut({ request, env, params }) {
  const existing = await env.DB.prepare('SELECT * FROM special_days WHERE id = ?').bind(params.id).first();
  if (!existing) return json({ error: 'No encontrado' }, 404);

  const body = await request.json();
  const merged = { ...rowToDay(existing), ...body, id: params.id };

  await env.DB.prepare(
    `UPDATE special_days
     SET day = ?, month = ?, year = ?, recurring = ?, name = ?, description = ?, colorIndex = ?, category = ?, remindDaysBefore = ?, endDay = ?, endMonth = ?
     WHERE id = ?`
  ).bind(
    merged.day,
    merged.month,
    merged.year ?? null,
    merged.recurring ? 1 : 0,
    merged.name,
    merged.description ?? '',
    merged.colorIndex,
    merged.category,
    merged.remindDaysBefore ?? null,
    merged.endDay ?? null,
    merged.endMonth ?? null,
    params.id
  ).run();

  return json(merged);
}

export async function onRequestDelete({ env, params }) {
  await env.DB.prepare('DELETE FROM special_days WHERE id = ?').bind(params.id).run();
  return new Response(null, { status: 204 });
}
