-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "details" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "ConsolidationDirection_directionId_periodeId_idx" ON "ConsolidationDirection"("directionId", "periodeId");

-- CreateIndex
CREATE INDEX "ConsolidationService_serviceId_periodeId_idx" ON "ConsolidationService"("serviceId", "periodeId");

-- CreateIndex
CREATE INDEX "KpiEmploye_employeId_periodeId_statut_idx" ON "KpiEmploye"("employeId", "periodeId", "statut");

-- CreateIndex
CREATE INDEX "KpiEmploye_kpiServiceId_periodeId_idx" ON "KpiEmploye"("kpiServiceId", "periodeId");

-- CreateIndex
CREATE INDEX "SaisieMensuelle_kpiEmployeId_statut_idx" ON "SaisieMensuelle"("kpiEmployeId", "statut");

-- CreateIndex
CREATE INDEX "SaisieMensuelle_employeId_mois_annee_statut_idx" ON "SaisieMensuelle"("employeId", "mois", "annee", "statut");

-- CreateIndex
CREATE INDEX "ScorePeriode_kpiEmployeId_periodeId_idx" ON "ScorePeriode"("kpiEmployeId", "periodeId");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
