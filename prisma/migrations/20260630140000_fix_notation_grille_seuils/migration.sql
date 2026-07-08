-- Corrige les trous entre paliers (ex. 95,3% classé « Insuffisant » au lieu de « Satisfaisant »)
UPDATE "NotationGrilleNiveau"
SET "seuilMax" = 95.99,
    "notationLibelle" = '86% à 95,99%',
    "updatedAt" = NOW()
WHERE "niveau" = 'SATISFAISANT' AND ("seuilMax" IS NULL OR "seuilMax" <= 95);

UPDATE "NotationGrilleNiveau"
SET "seuilMax" = 85.99,
    "notationLibelle" = '50% à 85,99%',
    "updatedAt" = NOW()
WHERE "niveau" = 'MOYEN' AND ("seuilMax" IS NULL OR "seuilMax" <= 85);
