# Décisions d'architecture

Ce fichier consigne les décisions non triviales prises en autonomie.

## D1 — Pile : Next.js 16 + React 19 + Tailwind v4 (au lieu de « ≥14 »)

`create-next-app@latest` installe Next 16.2.6 / React 19 / Tailwind v4. Le cahier des
charges demandait « ≥ 14 ». On reste sur la dernière version stable.
**Conséquence :** Tailwind v4 n'utilise plus `tailwind.config.js` mais des tokens CSS via
`@theme` dans `app/globals.css`. La palette grège/lavande y est définie comme tokens
(`--color-grege-*`, `--color-lavande-*`, `--color-armenien`), conformément à l'esprit du §7
(« ne pas coder les couleurs en dur »).

## D2 — next-intl sans routage de locale

L'UI est en français uniquement ; l'arménien (HY) est une **donnée de contenu** (traductions,
items d'exercices), pas une locale d'interface. On configure donc next-intl **sans** segment
`/[locale]` dans l'URL, ce qui préserve l'arborescence du §3 (`/manuel/[lettre]`, etc.).
Les chaînes arméniennes reçoivent `lang="hy"` + un traitement visuel distinctif (police Noto
Armenian, couleur verte) défini dans `globals.css`.

## D3 — Contenu source : le « manuel » fourni n'est qu'un gabarit

**Constat à l'ouverture des `.docx` :**

- `content/Paronymes_livret_exercices.docx` est **complet et réel** : les 20 typologies
  d'exercices avec tous leurs items + un corrigé commenté détaillé. Source de premier ordre.
- `content/Paronymes_manuel_fr-hy.docx` (« Les Paronymes - Modele ») est un **gabarit** : un
  seul chapitre complet (Éminent · Imminent) + un tableau « Mise en regard » de ~4 paires +
  2 exercices d'exemple. **Le manuel de 225 paires n'existe pas dans la source.**

**Décision (conforme au §1.3 : ne pas échouer, produire un contenu représentatif, avertir) :**

1. Extraire le contenu **réel** des exercices dans `content/exercises.json`.
2. Bâtir `content/manual.json` à partir des paires **réellement attestées** dans les sources :
   le chapitre gabarit + les paires citées (avec définitions/distinctions exactes) dans le
   corrigé commenté du livret.
3. Les **traductions arméniennes** ne sont fiables que pour les paires du tableau « Mise en
   regard » et de l'exercice 17. Pour les autres, le champ `translationHy` est complété au
   mieux et l'entrée est marquée `reviewNeeded: true` — on ne fabrique pas d'arménien douteux.
4. La cible « 225 groupes » du Definition of Done n'est **pas atteignable** depuis la source
   fournie ; l'architecture la supporte, et l'écart est documenté ici et dans le README pour
   relecture/complément par l'auteur (depuis le PC ou l'iPhone, via `content/manual.json`).

## D4 — Authentification GitHub

Git Credential Manager est configuré au niveau système (Windows). Le premier `git push`
déclenche l'authentification via le navigateur. Aucun token n'est stocké dans le dépôt.
