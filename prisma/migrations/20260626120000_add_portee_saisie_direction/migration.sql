-- CreateEnum
CREATE TYPE "PorteeKpi" AS ENUM ('DIRECTION', 'INDIVIDUEL');

-- AlterTable
ALTER TABLE "CatalogueKpi" ADD COLUMN "portee" "PorteeKpi" NOT NULL DEFAULT 'INDIVIDUEL';

-- CreateTable
CREATE TABLE "SaisieDirection" (
    "id" SERIAL NOT NULL,
    "kpiDirectionId" INTEGER NOT NULL,
    "mois" INTEGER NOT NULL,
    "annee" INTEGER NOT NULL,
    "valeur_prevue" DOUBLE PRECISION,
    "valeur_realisee" DOUBLE PRECISION,
    "commentaire" TEXT,
    "statut" "StatutSaisie" NOT NULL,
    "en_retard" BOOLEAN NOT NULL DEFAULT false,
    "soumis_le" TIMESTAMP(3),
    "valideParId" INTEGER,
    "valide_le" TIMESTAMP(3),
    "valeur_ajustee" DOUBLE PRECISION,
    "motif_ajustement" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaisieDirection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScorePeriodeDirection" (
    "id" SERIAL NOT NULL,
    "kpiDirectionId" INTEGER NOT NULL,
    "periodeId" INTEGER NOT NULL,
    "valeur_agregee" DOUBLE PRECISION NOT NULL,
    "taux_atteinte" DOUBLE PRECISION NOT NULL,
    "calcule_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScorePeriodeDirection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SaisieDirection_kpiDirectionId_mois_annee_key" ON "SaisieDirection"("kpiDirectionId", "mois", "annee");

-- CreateIndex
CREATE INDEX "SaisieDirection_kpiDirectionId_statut_idx" ON "SaisieDirection"("kpiDirectionId", "statut");

-- CreateIndex
CREATE INDEX "SaisieDirection_mois_annee_statut_idx" ON "SaisieDirection"("mois", "annee", "statut");

-- CreateIndex
CREATE INDEX "ScorePeriodeDirection_kpiDirectionId_periodeId_idx" ON "ScorePeriodeDirection"("kpiDirectionId", "periodeId");

-- AddForeignKey
ALTER TABLE "SaisieDirection" ADD CONSTRAINT "SaisieDirection_kpiDirectionId_fkey" FOREIGN KEY ("kpiDirectionId") REFERENCES "KpiDirection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaisieDirection" ADD CONSTRAINT "SaisieDirection_valideParId_fkey" FOREIGN KEY ("valideParId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScorePeriodeDirection" ADD CONSTRAINT "ScorePeriodeDirection_kpiDirectionId_fkey" FOREIGN KEY ("kpiDirectionId") REFERENCES "KpiDirection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScorePeriodeDirection" ADD CONSTRAINT "ScorePeriodeDirection_periodeId_fkey" FOREIGN KEY ("periodeId") REFERENCES "Periode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data: KPI importés (code KPIxx-YY) → portée DIRECTION
UPDATE "CatalogueKpi" SET "portee" = 'DIRECTION' WHERE "code" IS NOT NULL AND "code" ~ '^KPI';
