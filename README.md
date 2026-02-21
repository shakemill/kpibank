# BGFI KPI – Suivi des objectifs et saisies

Application de suivi des KPI (indicateurs de performance) et des saisies mensuelles pour la banque. Next.js 16, authentification NextAuth, base PostgreSQL avec Prisma.

---

## Prérequis

- **Node.js** 18+ (recommandé : 20 LTS)
- **PostgreSQL** 14+
- **pnpm** (recommandé) ou npm / yarn

---

## Installation

### 1. Cloner et installer les dépendances

```bash
cd bgfikpi-main
pnpm install
```

### 2. Base de données

Créer une base PostgreSQL (ex. `kpi_banque`) puis configurer l’URL de connexion (voir variables d’environnement).

```bash
# Générer le client Prisma
pnpm exec prisma generate

# Appliquer les migrations
pnpm exec prisma migrate dev
```

### 3. Variables d’environnement

Créer un fichier `.env.local` à la racine du projet (ou `.env` selon votre setup) avec au minimum :

```env
# Obligatoire
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
AUTH_SECRET="une-chaine-aleatoire-longue-et-securisee"

# Optionnel (pour cron jobs)
CRON_SECRET="secret-partage-avec-le-planificateur"
```

- **DATABASE_URL** : URL de connexion PostgreSQL (ex. `postgresql://user:pass@localhost:5432/kpi_banque`).
- **AUTH_SECRET** : secret pour les sessions NextAuth (générer avec `openssl rand -base64 32`).
- **CRON_SECRET** : secret partagé avec le planificateur de tâches pour appeler les endpoints cron (header `x-cron-secret` ou `Authorization: Bearer <CRON_SECRET>`).

En développement, une URL `NEXTAUTH_URL` (ex. `http://localhost:3000`) peut être utile selon la config NextAuth.

### 4. Données initiales (seed)

```bash
# Seed par défaut
pnpm exec prisma db seed

# Seed année 2026 (si disponible)
pnpm run seed:2026
```

### 5. Lancer l’application

```bash
# Développement
pnpm dev

# Build production
pnpm build
pnpm start
```

L’app est accessible sur `http://localhost:3000` (ou le port configuré).

---

## Commandes utiles

| Commande | Description |
|----------|-------------|
| `pnpm dev` | Serveur de développement |
| `pnpm build` | Build de production |
| `pnpm start` | Démarrer en mode production |
| `pnpm exec prisma generate` | Régénérer le client Prisma |
| `pnpm exec prisma migrate dev` | Créer / appliquer les migrations |
| `pnpm exec prisma db seed` | Exécuter le seed |
| `pnpm run seed:2026` | Seed spécifique année 2026 |
| `pnpm lint` | Lancer ESLint |

---

## Rôles et accès

| Rôle | Accès |
|-----|--------|
| **DG** | Toute l’organisation, admin, paramètres, utilisateurs, tableaux de bord direction / service / employé. |
| **DIRECTEUR** | Sa direction : KPI direction, services et employés de la direction, validation des saisies dans son périmètre. |
| **CHEF_SERVICE** | Son service : KPI service, employés du service, validation des saisies dans son périmètre. |
| **MANAGER** | Son équipe (subordonnés directs) : saisies, validation / rejet / ajustement. |
| **EMPLOYE** | Ses propres KPI et saisies uniquement. |

Les données d’un employé (saisies, KPI employé) ne sont accessibles qu’à :
- l’employé lui-même,
- son manager direct,
- le chef de son service,
- le directeur de sa direction,
- le DG.

La première connexion peut imposer un **changement de mot de passe** (champ `force_password_change`). Dans ce cas, l’utilisateur est redirigé vers `/profil` pour modifier son mot de passe avant d’accéder au reste de l’application.

---

## Cron jobs

Les endpoints suivants doivent être appelés par un planificateur (cron) avec le secret configuré.

### Authentification

- Header : `x-cron-secret: <CRON_SECRET>`  
  **ou**  
  `Authorization: Bearer <CRON_SECRET>`

### URLs à planifier

| URL | Méthode | Rôle |
|-----|--------|------|
| `/api/cron/consolidation` | GET | Consolidation des scores par direction pour les périodes en cours. |
| `/api/cron/rappels` | GET | Rappels de saisie (J-3, J-1) et création des saisies manquantes (J+1). |

Exemple (à adapter à votre hébergeur) :

```bash
# Tous les jours à 2h (exemple)
0 2 * * * curl -s -H "x-cron-secret: VOTRE_CRON_SECRET" https://votre-domaine.com/api/cron/consolidation
0 2 * * * curl -s -H "x-cron-secret: VOTRE_CRON_SECRET" https://votre-domaine.com/api/cron/rappels
```

---

## Structure du projet

- `src/app/` : routes Next.js (App Router), pages dashboard, API.
- `src/app/api/` : routes API (saisies, KPI, notifications, periodes, profil, cron, etc.).
- `src/lib/` : auth, prisma, helpers (api-response, sanitize, rate-limit, access-control), métier (saisie-utils, consolidation, notifications).
- `prisma/` : schéma et migrations, seeds.

---

## Licence

Projet interne.
