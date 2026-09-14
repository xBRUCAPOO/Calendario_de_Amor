-- ==========================================================================
-- FECHAS IMPORTANTES — migration-2026-09-rango-fechas.sql
-- Migración para bases D1 que ya estaban desplegadas ANTES de este cambio
-- (si vas a crear la base de cero, no hace falta: ya está en schema.sql).
--
-- Agrega las columnas endDay/endMonth a special_days, necesarias para los
-- días que abarcan un rango de varias fechas (ej. "Semana de la Dulzura",
-- 1 al 7 de julio). En el resto de los días quedan en NULL.
--
-- Ejecutar una sola vez contra la base D1 ya creada:
--   npx wrangler d1 execute fechas_importantes_db --file=migration-2026-09-rango-fechas.sql --remote
-- ==========================================================================

ALTER TABLE special_days ADD COLUMN endDay INTEGER;
ALTER TABLE special_days ADD COLUMN endMonth INTEGER;
