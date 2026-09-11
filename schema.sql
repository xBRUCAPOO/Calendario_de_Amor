-- ==========================================================================
-- FECHAS IMPORTANTES — schema.sql
-- Ejecutar una sola vez contra la base D1 (ver BACKEND-README.md):
--   wrangler d1 execute fechas_importantes_db --file=schema.sql --remote
-- ==========================================================================

CREATE TABLE IF NOT EXISTS special_days (
  id TEXT PRIMARY KEY,
  day INTEGER NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER,                          -- NULL si "recurring" = 1 (se repite todos los años)
  recurring INTEGER NOT NULL DEFAULT 1,  -- 0 = fecha puntual con año, 1 = se repite cada año
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  colorIndex INTEGER NOT NULL DEFAULT 1, -- 1 a 50, matchea --special-color-N en style.css
  category TEXT NOT NULL DEFAULT 'otro', -- pareja | cumpleanos | aniversario | feriado | otro
  remindDaysBefore INTEGER               -- NULL = sin recordatorio, 0 = el mismo día
);
