-- Corrige une contrainte unique erronée éventuelle (catalogueKpiId seul)
-- qui bloquait l'affectation du même KPI à plusieurs directions.
DROP INDEX IF EXISTS "DirectionCatalogueKpi_catalogueKpiId_key";
DROP INDEX IF EXISTS "DirectionCatalogueKpi_catalogueKpiId_unique";

-- S'assurer que l'index composite correct existe
CREATE UNIQUE INDEX IF NOT EXISTS "DirectionCatalogueKpi_directionId_catalogueKpiId_key"
ON "DirectionCatalogueKpi"("directionId", "catalogueKpiId");
