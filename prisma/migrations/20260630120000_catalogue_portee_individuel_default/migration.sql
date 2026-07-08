-- Rétablir la portée INDIVIDUEL par défaut pour le catalogue (import précédent forçait DIRECTION)
UPDATE "CatalogueKpi" SET "portee" = 'INDIVIDUEL' WHERE "portee" = 'DIRECTION';
