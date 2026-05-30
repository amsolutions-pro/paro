# TODO — Plateforme Paronymes FR–HY

## Étape 1 — Initialisation, dépôt & socle

- [x] Git init, branche `main`, remote `origin` → github.com/amsolutions-pro/paro
- [x] `.gitignore` (exclut node_modules/.next/dev.db/.env\*, conserve `content/`)
- [x] `.docx` sources rangés dans `content/`
- [x] create-next-app (App Router, TS strict, Tailwind v4, ESLint)
- [x] Prettier + plugin Tailwind
- [x] Arborescence `/src` (domain, server, components, lib)
- [x] next-intl (FR par défaut, sans routage de locale)
- [x] Tokens Tailwind grège/lavande + vert arménien
- [x] Polices Noto (latin + arménien) via next/font
- [x] Page d'accueil + barre de navigation persistante + pages-stub
- [x] Build + lint + typecheck OK, aucun warning TS, premier push `origin main` ✅

## Étape 2 — Données & seeding

- [ ] `schema.prisma` (User, ParonymGroup, Word, ExerciseItem, Attempt, ReviewState)
- [ ] Migration initiale
- [ ] `scripts/ingest.ts` (docx → content/manual.json + content/exercises.json via mammoth)
- [ ] `prisma/seed.ts` idempotent (upsert)
- [ ] Compléter chaque typologie jusqu'à 10 items (marqués `reviewNeeded`)
- [ ] Test d'encodage UTF-8 arménien (DB → API → composant)
- [ ] Gate : `npm run db:seed` peuple ≥ 200 items

## Étape 3 — Domaine & API

- [ ] `src/domain/grade.ts` (20 types) — testé
- [ ] `src/domain/srs.ts` (Leitner 5 boîtes) — testé
- [ ] Route handlers `/api` (manuel, items, tentative, stats, file SRS) + Zod
- [ ] Gate : tests unitaires domaine verts + intégration routes

## Étape 4 — Interface

- [ ] Manuel (intercalaires + recherche + encadré « Le bon usage »)
- [ ] Liste des 20 typologies
- [ ] `ExercisePlayer` + 20 composants de rendu + modale « Corrigé commenté »
- [ ] Tableau de bord (Recharts)
- [ ] Onglet « Mes points faibles »
- [ ] Responsive + a11y (glisser-déposer avec fallback tactile/clavier)

## Étape 5 — Tests, conformité, finalisation

- [ ] 2–3 parcours Playwright
- [ ] lint + typecheck + test au vert ; `npm run build` OK
- [ ] README/DECISIONS finaux + liste des items `reviewNeeded`
