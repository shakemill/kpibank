-- CreateTable
CREATE TABLE "DirectionCatalogueKpi" (
    "id" SERIAL NOT NULL,
    "directionId" INTEGER NOT NULL,
    "catalogueKpiId" INTEGER NOT NULL,
    "creeParId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DirectionCatalogueKpi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DirectionCatalogueKpi_directionId_idx" ON "DirectionCatalogueKpi"("directionId");

-- CreateIndex
CREATE UNIQUE INDEX "DirectionCatalogueKpi_directionId_catalogueKpiId_key" ON "DirectionCatalogueKpi"("directionId", "catalogueKpiId");

-- AddForeignKey
ALTER TABLE "DirectionCatalogueKpi" ADD CONSTRAINT "DirectionCatalogueKpi_directionId_fkey" FOREIGN KEY ("directionId") REFERENCES "Direction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectionCatalogueKpi" ADD CONSTRAINT "DirectionCatalogueKpi_catalogueKpiId_fkey" FOREIGN KEY ("catalogueKpiId") REFERENCES "CatalogueKpi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectionCatalogueKpi" ADD CONSTRAINT "DirectionCatalogueKpi_creeParId_fkey" FOREIGN KEY ("creeParId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
