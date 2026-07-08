-- AlterEnum
ALTER TYPE "PorteeKpi" ADD VALUE 'SERVICE';

-- AlterTable
ALTER TABLE "ConsolidationDirection" ADD COLUMN "score_direction_kpis" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "ConsolidationDirection" ADD COLUMN "score_employes" DOUBLE PRECISION NOT NULL DEFAULT 0;
