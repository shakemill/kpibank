-- CreateEnum
CREATE TYPE "Role" AS ENUM ('DG', 'DIRECTEUR', 'CHEF_SERVICE', 'MANAGER', 'EMPLOYE');

-- CreateEnum
CREATE TYPE "TypePeriode" AS ENUM ('MENSUEL', 'TRIMESTRIEL', 'SEMESTRIEL');

-- CreateEnum
CREATE TYPE "StatutPeriode" AS ENUM ('A_VENIR', 'EN_COURS', 'CLOTUREE');

-- CreateEnum
CREATE TYPE "TypeKpi" AS ENUM ('QUANTITATIF', 'QUALITATIF', 'COMPORTEMENTAL');

-- CreateEnum
CREATE TYPE "ModeAgregation" AS ENUM ('CUMUL', 'MOYENNE', 'DERNIER');

-- CreateEnum
CREATE TYPE "StatutKpi" AS ENUM ('DRAFT', 'ACTIF', 'CLOTURE');

-- CreateEnum
CREATE TYPE "StatutKpiEmploye" AS ENUM ('DRAFT', 'NOTIFIE', 'ACCEPTE', 'CONTESTE', 'MAINTENU', 'REVISE', 'VALIDE', 'CLOTURE');

-- CreateEnum
CREATE TYPE "StatutSaisie" AS ENUM ('OUVERTE', 'EN_RETARD', 'SOUMISE', 'VALIDEE', 'REJETEE', 'AJUSTEE', 'MANQUANTE', 'VERROUILLEE');

-- CreateEnum
CREATE TYPE "TypeNotification" AS ENUM ('RAPPEL_SAISIE', 'SAISIE_EN_RETARD', 'SAISIE_SOUMISE', 'VALIDATION_REQUISE', 'KPI_NOTIFIE', 'KPI_CONTESTE', 'KPI_MAINTENU', 'KPI_REVISE', 'PERIODE_CLOTUREE');

-- CreateTable
CREATE TABLE "Etablissement" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "logo" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Etablissement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Direction" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "etablissementId" INTEGER NOT NULL,
    "responsableId" INTEGER,

    CONSTRAINT "Direction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "directionId" INTEGER NOT NULL,
    "responsableId" INTEGER,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "telephone" TEXT,
    "role" "Role" NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "serviceId" INTEGER,
    "directionId" INTEGER,
    "managerId" INTEGER,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Periode" (
    "id" SERIAL NOT NULL,
    "type" "TypePeriode" NOT NULL,
    "code" TEXT NOT NULL,
    "mois_debut" INTEGER NOT NULL,
    "mois_fin" INTEGER NOT NULL,
    "annee" INTEGER NOT NULL,
    "date_debut" TIMESTAMP(3) NOT NULL,
    "date_fin" TIMESTAMP(3) NOT NULL,
    "date_limite_saisie" TIMESTAMP(3) NOT NULL,
    "statut" "StatutPeriode" NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Periode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogueKpi" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "type" "TypeKpi" NOT NULL,
    "unite" TEXT,
    "mode_agregation" "ModeAgregation" NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CatalogueKpi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiDirection" (
    "id" SERIAL NOT NULL,
    "catalogueKpiId" INTEGER NOT NULL,
    "directionId" INTEGER NOT NULL,
    "periodeId" INTEGER NOT NULL,
    "cible" DOUBLE PRECISION NOT NULL,
    "poids" DOUBLE PRECISION NOT NULL,
    "description_complementaire" TEXT,
    "statut" "StatutKpi" NOT NULL,
    "creeParId" INTEGER NOT NULL,

    CONSTRAINT "KpiDirection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiService" (
    "id" SERIAL NOT NULL,
    "catalogueKpiId" INTEGER NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "periodeId" INTEGER NOT NULL,
    "kpiDirectionId" INTEGER,
    "poids_dans_direction" DOUBLE PRECISION,
    "cible" DOUBLE PRECISION NOT NULL,
    "poids" DOUBLE PRECISION NOT NULL,
    "statut" "StatutKpi" NOT NULL,
    "creeParId" INTEGER NOT NULL,

    CONSTRAINT "KpiService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiEmploye" (
    "id" SERIAL NOT NULL,
    "catalogueKpiId" INTEGER NOT NULL,
    "employeId" INTEGER NOT NULL,
    "assigneParId" INTEGER NOT NULL,
    "kpiServiceId" INTEGER NOT NULL,
    "periodeId" INTEGER NOT NULL,
    "cible" DOUBLE PRECISION NOT NULL,
    "poids" DOUBLE PRECISION NOT NULL,
    "statut" "StatutKpiEmploye" NOT NULL,
    "date_notification" TIMESTAMP(3),
    "date_acceptation" TIMESTAMP(3),
    "motif_contestation" TEXT,
    "reponse_contestation" TEXT,

    CONSTRAINT "KpiEmploye_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaisieMensuelle" (
    "id" SERIAL NOT NULL,
    "kpiEmployeId" INTEGER NOT NULL,
    "employeId" INTEGER NOT NULL,
    "mois" INTEGER NOT NULL,
    "annee" INTEGER NOT NULL,
    "valeur_realisee" DOUBLE PRECISION,
    "commentaire" TEXT,
    "preuves" TEXT,
    "statut" "StatutSaisie" NOT NULL,
    "en_retard" BOOLEAN NOT NULL DEFAULT false,
    "soumis_le" TIMESTAMP(3),
    "valideParId" INTEGER,
    "valide_le" TIMESTAMP(3),
    "valeur_ajustee" DOUBLE PRECISION,
    "motif_ajustement" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaisieMensuelle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScorePeriode" (
    "id" SERIAL NOT NULL,
    "kpiEmployeId" INTEGER NOT NULL,
    "periodeId" INTEGER NOT NULL,
    "valeur_agregee" DOUBLE PRECISION NOT NULL,
    "taux_atteinte" DOUBLE PRECISION NOT NULL,
    "calcule_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScorePeriode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsolidationService" (
    "id" SERIAL NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "periodeId" INTEGER NOT NULL,
    "taux_atteinte_moyen" DOUBLE PRECISION NOT NULL,
    "nb_employes_total" INTEGER NOT NULL,
    "nb_employes_objectif_atteint" INTEGER NOT NULL,
    "calcule_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsolidationService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsolidationDirection" (
    "id" SERIAL NOT NULL,
    "directionId" INTEGER NOT NULL,
    "periodeId" INTEGER NOT NULL,
    "taux_atteinte_moyen" DOUBLE PRECISION NOT NULL,
    "calcule_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsolidationDirection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parametre" (
    "id" SERIAL NOT NULL,
    "cle" TEXT NOT NULL,
    "valeur" TEXT NOT NULL,
    "description" TEXT,
    "modifieParId" INTEGER NOT NULL,
    "modifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Parametre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "destinataireId" INTEGER NOT NULL,
    "type" "TypeNotification" NOT NULL,
    "titre" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "lien" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" SERIAL NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SaisieMensuelle_kpiEmployeId_mois_annee_key" ON "SaisieMensuelle"("kpiEmployeId", "mois", "annee");

-- CreateIndex
CREATE UNIQUE INDEX "Parametre_cle_key" ON "Parametre"("cle");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- AddForeignKey
ALTER TABLE "Direction" ADD CONSTRAINT "Direction_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Direction" ADD CONSTRAINT "Direction_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_directionId_fkey" FOREIGN KEY ("directionId") REFERENCES "Direction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_directionId_fkey" FOREIGN KEY ("directionId") REFERENCES "Direction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiDirection" ADD CONSTRAINT "KpiDirection_catalogueKpiId_fkey" FOREIGN KEY ("catalogueKpiId") REFERENCES "CatalogueKpi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiDirection" ADD CONSTRAINT "KpiDirection_directionId_fkey" FOREIGN KEY ("directionId") REFERENCES "Direction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiDirection" ADD CONSTRAINT "KpiDirection_periodeId_fkey" FOREIGN KEY ("periodeId") REFERENCES "Periode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiDirection" ADD CONSTRAINT "KpiDirection_creeParId_fkey" FOREIGN KEY ("creeParId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiService" ADD CONSTRAINT "KpiService_catalogueKpiId_fkey" FOREIGN KEY ("catalogueKpiId") REFERENCES "CatalogueKpi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiService" ADD CONSTRAINT "KpiService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiService" ADD CONSTRAINT "KpiService_periodeId_fkey" FOREIGN KEY ("periodeId") REFERENCES "Periode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiService" ADD CONSTRAINT "KpiService_kpiDirectionId_fkey" FOREIGN KEY ("kpiDirectionId") REFERENCES "KpiDirection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiService" ADD CONSTRAINT "KpiService_creeParId_fkey" FOREIGN KEY ("creeParId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiEmploye" ADD CONSTRAINT "KpiEmploye_catalogueKpiId_fkey" FOREIGN KEY ("catalogueKpiId") REFERENCES "CatalogueKpi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiEmploye" ADD CONSTRAINT "KpiEmploye_employeId_fkey" FOREIGN KEY ("employeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiEmploye" ADD CONSTRAINT "KpiEmploye_assigneParId_fkey" FOREIGN KEY ("assigneParId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiEmploye" ADD CONSTRAINT "KpiEmploye_kpiServiceId_fkey" FOREIGN KEY ("kpiServiceId") REFERENCES "KpiService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiEmploye" ADD CONSTRAINT "KpiEmploye_periodeId_fkey" FOREIGN KEY ("periodeId") REFERENCES "Periode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaisieMensuelle" ADD CONSTRAINT "SaisieMensuelle_kpiEmployeId_fkey" FOREIGN KEY ("kpiEmployeId") REFERENCES "KpiEmploye"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaisieMensuelle" ADD CONSTRAINT "SaisieMensuelle_employeId_fkey" FOREIGN KEY ("employeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaisieMensuelle" ADD CONSTRAINT "SaisieMensuelle_valideParId_fkey" FOREIGN KEY ("valideParId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScorePeriode" ADD CONSTRAINT "ScorePeriode_kpiEmployeId_fkey" FOREIGN KEY ("kpiEmployeId") REFERENCES "KpiEmploye"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScorePeriode" ADD CONSTRAINT "ScorePeriode_periodeId_fkey" FOREIGN KEY ("periodeId") REFERENCES "Periode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsolidationService" ADD CONSTRAINT "ConsolidationService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsolidationService" ADD CONSTRAINT "ConsolidationService_periodeId_fkey" FOREIGN KEY ("periodeId") REFERENCES "Periode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsolidationDirection" ADD CONSTRAINT "ConsolidationDirection_directionId_fkey" FOREIGN KEY ("directionId") REFERENCES "Direction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsolidationDirection" ADD CONSTRAINT "ConsolidationDirection_periodeId_fkey" FOREIGN KEY ("periodeId") REFERENCES "Periode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parametre" ADD CONSTRAINT "Parametre_modifieParId_fkey" FOREIGN KEY ("modifieParId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_destinataireId_fkey" FOREIGN KEY ("destinataireId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
