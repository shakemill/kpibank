-- CreateEnum
CREATE TYPE "CategorieKpi" AS ENUM ('STRATEGIQUE', 'OPERATIONNEL');

-- CreateEnum
CREATE TYPE "FrequenceKpi" AS ENUM ('MENSUELLE', 'TRIMESTRIELLE', 'SEMESTRIELLE', 'ANNUELLE', 'EVENEMENTIELLE');

-- CreateEnum
CREATE TYPE "SensCalculKpi" AS ENUM ('DIRECT', 'PLAFOND', 'ZERO_DEFAUT', 'ABSOLU');

-- AlterTable
ALTER TABLE "CatalogueKpi" ADD COLUMN     "code" TEXT,
ADD COLUMN     "objectif_qualite" TEXT,
ADD COLUMN     "formule" TEXT,
ADD COLUMN     "categorie" "CategorieKpi",
ADD COLUMN     "frequence" "FrequenceKpi",
ADD COLUMN     "sens_calcul" "SensCalculKpi" NOT NULL DEFAULT 'DIRECT';

-- CreateIndex
CREATE UNIQUE INDEX "CatalogueKpi_code_key" ON "CatalogueKpi"("code");
