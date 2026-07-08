-- CreateTable
CREATE TABLE "NotationGrilleNiveau" (
    "id" SERIAL NOT NULL,
    "niveau" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "seuilMin" DOUBLE PRECISION NOT NULL,
    "seuilMax" DOUBLE PRECISION,
    "appreciation" TEXT NOT NULL,
    "commentaire" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotationGrilleNiveau_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotationGrilleNiveau_niveau_key" ON "NotationGrilleNiveau"("niveau");

-- CreateIndex
CREATE INDEX "NotationGrilleNiveau_ordre_idx" ON "NotationGrilleNiveau"("ordre");

-- Seed default grille
INSERT INTO "NotationGrilleNiveau" ("niveau", "ordre", "seuilMin", "seuilMax", "appreciation", "commentaire", "updatedAt") VALUES
('EXCELLENT', 1, 101, NULL, 'Excellent', 'Dépasse largement les attentes', NOW()),
('TRES_BIEN', 2, 96, 100, 'Très Bien', 'Correspond aux attentes', NOW()),
('SATISFAISANT', 3, 86, 95, 'Satisfaisant', 'Sur certains aspects de son poste a besoin d''amélioration', NOW()),
('MOYEN', 4, 50, 85, 'Moyen', 'En dessous des attentes', NOW()),
('INSUFFISANT', 5, 0, 49.99, 'Insuffisant', 'Ne répond pas aux attentes', NOW());
