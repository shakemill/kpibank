-- Resynchronise la séquence SERIAL après imports / seed avec IDs explicites.
-- Sans cela, create() tente des id déjà pris → Unique constraint failed on (`id`).
SELECT setval(
  pg_get_serial_sequence('"DirectionCatalogueKpi"', 'id'),
  GREATEST(COALESCE((SELECT MAX(id) FROM "DirectionCatalogueKpi"), 1), 1),
  true
);
