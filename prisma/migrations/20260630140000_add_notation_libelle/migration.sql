-- AlterTable
ALTER TABLE "NotationGrilleNiveau" ADD COLUMN "notationLibelle" TEXT;

-- Libellés officiels (référentiel BGFI)
UPDATE "NotationGrilleNiveau" SET "notationLibelle" = '101% et +' WHERE "niveau" = 'EXCELLENT';
UPDATE "NotationGrilleNiveau" SET "notationLibelle" = '96% et 100%' WHERE "niveau" = 'TRES_BIEN';
UPDATE "NotationGrilleNiveau" SET "notationLibelle" = '86% et 95%' WHERE "niveau" = 'SATISFAISANT';
UPDATE "NotationGrilleNiveau" SET "notationLibelle" = '50% et 85%' WHERE "niveau" = 'MOYEN';
UPDATE "NotationGrilleNiveau" SET "notationLibelle" = '<50%' WHERE "niveau" = 'INSUFFISANT';
