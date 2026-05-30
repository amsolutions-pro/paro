# Paronymes FR–HY — plateforme d'apprentissage (niveau B2)

Application web bilingue **français — հայերեն** pour apprendre les **paronymes du français**.
Elle réunit un **manuel raisonné** (dictionnaire de paires/triades de paronymes avec traduction
arménienne) et **20 typologies d'exercices** à correction immédiate et corrigé commenté, plus un
**tableau de bord** et une **révision espacée (SRS)**.

## Pile technique

- **Next.js 16** (App Router) · **React 19** · **TypeScript** (mode `strict`)
- **Tailwind CSS v4** (tokens grège/lavande via `@theme` dans `app/globals.css`)
- **Prisma + SQLite** en dev (`dev.db`) — migrable vers PostgreSQL/Supabase
- **Zod** (validation partagée), **Zustand** (état léger), **Recharts** (graphiques)
- **next-intl** (UI en français ; l'arménien est traité comme contenu)
- **Vitest** + Testing Library (unitaire/intégration), **Playwright** (e2e)

## Démarrage rapide

```bash
npm install
cp .env.example .env      # DATABASE_URL="file:./dev.db"
npm run db:seed           # peuple dev.db depuis content/*.json   (dispo dès l'étape 2)
npm run dev               # http://localhost:3000
```

> Sur un environnement neuf (y compris la session mobile dans le cloud), `npm install &&
npm run db:seed && npm run dev` suffit : `content/*.json` est versionné, `dev.db` est régénéré.

## Scripts

| Script              | Rôle                                                       |
| ------------------- | ---------------------------------------------------------- |
| `npm run dev`       | Serveur de développement                                   |
| `npm run build`     | Build de production                                        |
| `npm run start`     | Serveur de production                                      |
| `npm run lint`      | ESLint                                                     |
| `npm run typecheck` | `tsc --noEmit`                                             |
| `npm run db:seed`   | Seeding de la base depuis `content/*.json` _(étape 2)_     |
| `npm run ingest`    | Réextraction des `.docx` vers `content/*.json` _(étape 2)_ |
| `npm test`          | Tests Vitest _(étape 3)_                                   |
| `npm run test:e2e`  | Tests Playwright _(étape 5)_                               |

## Architecture

```
/app                  # Routes App Router (accueil, /manuel, /exercices, /revision, /tableau-de-bord, /api)
/src
  /domain             # Logique pure testable (grade, srs) — sans I/O
  /server             # Accès données (Prisma), services
  /components         # UI réutilisable (+ /exercises : un rendu par typologie)
  /lib                # utils, schémas Zod, i18n, constantes
/content              # Sources .docx + manual.json + exercises.json (VERSIONNÉS)
/prisma               # schema.prisma + migrations + seed.ts
/scripts              # ingest.ts (docx -> json)
/tests                # unit + e2e
/messages             # Traductions UI (fr.json)
```

## Synchronisation PC ↔ iPhone

GitHub (`amsolutions-pro/paro`, branche `main`) est la **source de vérité unique**. Au début de
chaque session : `git pull --rebase origin main`. À la fin : `git add -A && git commit && git
push origin main`. **Un seul appareil à la fois.** `dev.db` n'est pas versionné mais régénérable
(`npm run db:seed`) car `content/*.json` l'est.

## Contenu source — note importante

Voir **DECISIONS.md (D3)** : le livret d'exercices fourni est complet (20 typologies + corrigé),
mais le « manuel » fourni n'est qu'un **gabarit** (1 chapitre + ~4 paires). Le manuel de 225
paires n'existe pas dans la source. Le manuel est donc reconstruit à partir des paires réellement
attestées dans les sources ; les entrées complétées sont marquées `reviewNeeded` pour relecture.

## État d'avancement

Voir **TODO.md**. Décisions d'architecture : **DECISIONS.md**.
