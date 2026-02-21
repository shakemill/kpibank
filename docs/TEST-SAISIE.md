# Test du module Saisie des réalisations

Mot de passe commun (seed) : **`Password123!`**

**Période de test en cours :** utilisez le mois **Février 2026** dans le sélecteur pour tester la saisie (période S1-2026).

- **Base vide** : `pnpm prisma migrate reset` remplit la base (seed complet avec 2026).
- **Base déjà remplie** : `pnpm seed:2026` ajoute les données 2026 (période S1-2026 + KPI Mehdi) et les saisies pour **Février 2026** si besoin.

---

## 1. Tester en tant qu’**employé** (saisie)

1. Démarrer l’app : `pnpm dev` puis ouvrir **http://localhost:3000**
2. Se connecter :
   - **Email :** `mehdi.ouali@bgfi.com`
   - **Mot de passe :** `Password123!`
3. Dans le menu : **« Saisir mes réalisations »** (ou aller sur **http://localhost:3000/saisie**).
4. Choisir le mois **Février 2026** dans le sélecteur.
5. Vérifier :
   - Les 3 cartes KPI (Dossiers, Satisfaction client, Maîtrise CRM).
   - Saisir des valeurs, **Enregistrer brouillon**, puis **Soumettre pour validation** (quand tout est rempli).

---

## 2. Tester en tant que **manager** (validation)

1. Se déconnecter puis se connecter avec :
   - **Email :** `manager.pme@bgfi.com`
   - **Mot de passe :** `Password123!`
2. Dans le menu : **« Valider saisies »** (ou **http://localhost:3000/manager/validation**).
3. Vérifier :
   - **Onglet « Saisies en attente »** : les saisies soumises par Mehdi (après test 1).
   - **Valider** / **Ajuster** (valeur + motif) / **Rejeter** (motif).
   - **Tout valider** pour un employé.
   - **Onglet « Saisies manquantes »** : employés sans saisie pour le mois.

---

## Autres comptes (seed)

| Rôle       | Email                  | Mot de passe  |
|-----------|------------------------|---------------|
| Employé   | mehdi.ouali@bgfi.com   | Password123!  |
| Employé   | rim.tahiri@banque.ma   | Password123!  |
| Manager   | manager.pme@bgfi.com   | Password123!  |
| Chef serv.| chef.pme@bgfi.com      | Password123!  |
| DG        | youssef.benali@bgfi.com| Password123!  |
