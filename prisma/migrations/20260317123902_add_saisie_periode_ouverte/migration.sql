-- CreateTable
CREATE TABLE "SaisiePeriodeOuverte" (
    "id" SERIAL NOT NULL,
    "employeId" INTEGER NOT NULL,
    "mois" INTEGER NOT NULL,
    "annee" INTEGER NOT NULL,
    "ouvertParId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaisiePeriodeOuverte_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SaisiePeriodeOuverte_employeId_idx" ON "SaisiePeriodeOuverte"("employeId");

-- CreateIndex
CREATE UNIQUE INDEX "SaisiePeriodeOuverte_employeId_mois_annee_key" ON "SaisiePeriodeOuverte"("employeId", "mois", "annee");

-- AddForeignKey
ALTER TABLE "SaisiePeriodeOuverte" ADD CONSTRAINT "SaisiePeriodeOuverte_employeId_fkey" FOREIGN KEY ("employeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaisiePeriodeOuverte" ADD CONSTRAINT "SaisiePeriodeOuverte_ouvertParId_fkey" FOREIGN KEY ("ouvertParId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
