import type { ExerciseItemContent, ManualGroupContent, WordContent } from "@/src/lib/content-schema";
import { EXERCISE_TYPES, type ExerciseType } from "@/src/lib/exercise-types";

/**
 * Complète chaque typologie jusqu'à TARGET items, à partir du pool de paronymes
 * réellement attestés dans le manuel (cf. §1.2). Les items produits ici sont
 * `source: "generated"` et `reviewNeeded: true` : cohérents (paronymes, définitions
 * et exemples réels du manuel) mais à relire avant publication.
 */
export const TARGET_PER_TYPE = 10;

function blank(sentence: string, headword: string): string {
  // Remplace la première occurrence du mot vedette (insensible à la casse) par des points.
  const re = new RegExp(headword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  return re.test(sentence) ? sentence.replace(re, "………") : `${sentence} (……… = ${headword})`;
}

function firstExample(w: WordContent): string {
  return w.examples[0] ?? `Exemple à compléter avec « ${w.headword} ».`;
}

/** Groupes binaires (exactement deux mots) — les plus simples à exploiter. */
function binaryGroups(groups: ManualGroupContent[]) {
  return groups.filter((g) => g.words.length >= 2);
}

type Gen = (groups: ManualGroupContent[], need: number, mk: (n: number) => string) => ExerciseItemContent[];

const base = (
  slug: string,
  type: ExerciseType,
  gradingMode: "AUTO" | "OPEN",
  fields: Partial<ExerciseItemContent>,
): ExerciseItemContent => ({
  slug,
  type,
  gradingMode,
  prompt: "",
  payload: {},
  solution: {},
  commentary: "",
  groupSlug: null,
  posClass: null,
  source: "generated",
  reviewNeeded: true,
  orderIndex: 0,
  ...fields,
});

const generators: Partial<Record<ExerciseType, Gen>> = {
  QCM: (groups, need, mk) => {
    const out: ExerciseItemContent[] = [];
    for (const g of binaryGroups(groups)) {
      if (out.length >= need) break;
      const [a, b] = g.words;
      out.push(
        base(mk(out.length + 1), "QCM", "AUTO", {
          prompt: blank(firstExample(a), a.headword),
          payload: { options: [{ key: "a", text: a.headword }, { key: "b", text: b.headword }] },
          solution: { correctKey: "a" },
          commentary: `${a.headword} — ${a.definition}`,
          groupSlug: g.slug,
          posClass: a.posClass,
        }),
      );
    }
    return out;
  },
  TROUS: (groups, need, mk) => {
    const out: ExerciseItemContent[] = [];
    for (const g of binaryGroups(groups)) {
      if (out.length >= need) break;
      const [a, b] = g.words;
      out.push(
        base(mk(out.length + 1), "TROUS", "AUTO", {
          prompt: blank(firstExample(a), a.headword),
          payload: { bank: [a.headword, b.headword], blanksCount: 1 },
          solution: { answers: [a.headword], accentSensitive: false },
          commentary: `${a.headword} — ${a.definition}`,
          groupSlug: g.slug,
          posClass: a.posClass,
        }),
      );
    }
    return out;
  },
  ANOMALIE: (groups, need, mk) => {
    const out: ExerciseItemContent[] = [];
    for (const g of binaryGroups(groups)) {
      if (out.length >= need) break;
      const [a, b] = g.words;
      const wrongSentence = firstExample(a).replace(
        new RegExp(a.headword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
        b.headword,
      );
      out.push(
        base(mk(out.length + 1), "ANOMALIE", "AUTO", {
          prompt: wrongSentence,
          payload: { sentence: wrongSentence },
          solution: { wrong: b.headword, correct: a.headword, accentSensitive: false },
          commentary: `${a.headword} — ${a.definition} (à ne pas confondre avec ${b.headword}).`,
          groupSlug: g.slug,
          posClass: a.posClass,
        }),
      );
    }
    return out;
  },
  REECRITURE: (groups, need, mk) => {
    const out: ExerciseItemContent[] = [];
    for (const g of binaryGroups(groups)) {
      if (out.length >= need) break;
      const [a, b] = g.words;
      // Génère les deux sens (a→b et b→a) pour plus de variété
      for (const [src, tgt] of [[a, b], [b, a]] as const) {
        if (out.length >= need) break;
        const ex = firstExample(src);
        out.push(
          base(mk(out.length + 1), "REECRITURE", "AUTO", {
            prompt: "Réécrivez la phrase en remplaçant le mot souligné par son paronyme, en adaptant le contexte si nécessaire.",
            payload: {
              phrase_depart: ex,
              mot_souligne: src.headword,
              indice: tgt.definition,
            },
            solution: {
              paronyme_attendu: tgt.headword,
              reponses_acceptees: [tgt.headword],
              corrige: firstExample(tgt),
              explication: `« ${src.headword} » — ${src.definition} · « ${tgt.headword} » — ${tgt.definition}`,
            },
            commentary: `Corrigé : ${firstExample(tgt)}\n\n${g.summary}`,
            groupSlug: g.slug,
            posClass: tgt.posClass,
          }),
        );
      }
    }
    return out;
  },
  APPARIEMENT: (groups, need, mk) => {
    const out: ExerciseItemContent[] = [];
    const words = groups.flatMap((g) => g.words.map((w) => ({ w, slug: g.slug })));
    for (let i = 0; out.length < need && i < words.length; i += 4) {
      const window = words.slice(i, i + 4);
      if (window.length < 3) break;
      const left = window.map((x, k) => ({ id: String(k + 1), text: x.w.headword }));
      const letters = ["a", "b", "c", "d", "e"];
      const right = window.map((x, k) => ({ id: letters[k], text: x.w.definition }));
      const pairs: Record<string, string> = {};
      window.forEach((_, k) => (pairs[String(k + 1)] = letters[k]));
      out.push(
        base(mk(out.length + 1), "APPARIEMENT", "AUTO", {
          prompt: "Associez chaque terme à sa définition exacte.",
          payload: { left, right },
          solution: { pairs },
          commentary: "Appariement terme ↔ définition (items générés depuis le manuel).",
          groupSlug: window[0].slug,
        }),
      );
    }
    return out;
  },
  AFFIXES: (groups, need, mk) => {
    const out: ExerciseItemContent[] = [];
    for (const g of binaryGroups(groups)) {
      if (out.length >= need) break;
      const [a, b] = g.words;
      out.push(
        base(mk(out.length + 1), "AFFIXES", "OPEN", {
          prompt: `Qu'est-ce qui distingue : ${a.headword} / ${b.headword} ? Précisez le sens de chacun.`,
          payload: { pair: [a.headword, b.headword] },
          solution: { model: g.summary },
          commentary: g.summary,
          groupSlug: g.slug,
        }),
      );
    }
    return out;
  },
  CONTEXTE: (groups, need, mk) => {
    const out: ExerciseItemContent[] = [];
    for (const g of binaryGroups(groups)) {
      if (out.length >= need) break;
      const a = g.words[0];
      out.push(
        base(mk(out.length + 1), "CONTEXTE", "OPEN", {
          prompt: `Rédigez une phrase correcte employant « ${a.headword} » à bon escient.`,
          payload: { word: a.headword, constraint: "phrase de niveau B2" },
          solution: { model: firstExample(a), note: a.definition },
          commentary: a.definition,
          groupSlug: g.slug,
          posClass: a.posClass,
        }),
      );
    }
    return out;
  },
  REMPLACEMENT: (groups, need, mk) => {
    const out: ExerciseItemContent[] = [];
    for (const g of binaryGroups(groups)) {
      if (out.length >= need) break;
      const a = g.words[0];
      const sentence = firstExample(a).replace(
        new RegExp(a.headword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
        `[${a.definition}]`,
      );
      out.push(
        base(mk(out.length + 1), "REMPLACEMENT", "AUTO", {
          prompt: sentence,
          payload: { sentence, periphrase: a.definition },
          solution: { answer: a.headword, accentSensitive: false },
          commentary: `${a.headword} — ${a.definition}`,
          groupSlug: g.slug,
          posClass: a.posClass,
        }),
      );
    }
    return out;
  },
  VRAIFAUX: (groups, need, mk) => {
    const out: ExerciseItemContent[] = [];
    let toggle = true;
    for (const g of binaryGroups(groups)) {
      if (out.length >= need) break;
      const [a, b] = g.words;
      if (toggle) {
        out.push(
          base(mk(out.length + 1), "VRAIFAUX", "AUTO", {
            prompt: `« ${a.headword} » signifie : ${a.definition}`,
            payload: { statement: `« ${a.headword} » signifie : ${a.definition}` },
            solution: { value: true, justification: g.summary },
            commentary: g.summary,
            groupSlug: g.slug,
            posClass: a.posClass,
          }),
        );
      } else {
        out.push(
          base(mk(out.length + 1), "VRAIFAUX", "AUTO", {
            prompt: `« ${a.headword} » signifie : ${b.definition}`,
            payload: { statement: `« ${a.headword} » signifie : ${b.definition}` },
            solution: { value: false, justification: `Non : c'est « ${b.headword} ». ${g.summary}` },
            commentary: g.summary,
            groupSlug: g.slug,
            posClass: a.posClass,
          }),
        );
      }
      toggle = !toggle;
    }
    return out;
  },
  TRANSFORMATION: (groups, need, mk) => {
    const out: ExerciseItemContent[] = [];
    for (const g of binaryGroups(groups)) {
      if (out.length >= need) break;
      const [a, b] = g.words;
      out.push(
        base(mk(out.length + 1), "TRANSFORMATION", "AUTO", {
          prompt: `Donnez le paronyme de « ${a.headword} » (${b.definition}).`,
          payload: { from: a.headword },
          solution: { answer: b.headword, accentSensitive: false },
          commentary: `${b.headword} — ${b.definition}`,
          groupSlug: g.slug,
          posClass: b.posClass,
        }),
      );
    }
    return out;
  },
  CORRECTION: (groups, need, mk) => {
    const out: ExerciseItemContent[] = [];
    for (const g of binaryGroups(groups)) {
      if (out.length >= need) break;
      const [a, b] = g.words;
      const wrongSentence = firstExample(b).replace(
        new RegExp(b.headword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
        a.headword,
      );
      out.push(
        base(mk(out.length + 1), "CORRECTION", "AUTO", {
          prompt: wrongSentence,
          payload: { sentence: wrongSentence, wrong: a.headword },
          solution: { answer: b.headword, accentSensitive: false },
          commentary: `${b.headword} — ${b.definition}`,
          groupSlug: g.slug,
          posClass: b.posClass,
        }),
      );
    }
    return out;
  },
  ETYMOLOGIE: (groups, need, mk) => {
    const out: ExerciseItemContent[] = [];
    const withOrigin = groups.flatMap((g) =>
      g.words.filter((w) => w.origin).map((w) => ({ w, slug: g.slug })),
    );
    // Fenêtres glissantes (pas de 1) : le pool d'étymons est restreint, on génère
    // des ensembles distincts en décalant d'un mot à chaque fois.
    for (let i = 0; out.length < need && i + 3 <= withOrigin.length; i += 1) {
      const window = withOrigin.slice(i, i + 4);
      if (window.length < 3) break;
      const left = window.map((x, k) => ({ id: String(k + 1), text: x.w.headword }));
      const letters = ["a", "b", "c", "d", "e"];
      const right = window.map((x, k) => ({ id: letters[k], text: x.w.origin as string }));
      const pairs: Record<string, string> = {};
      window.forEach((_, k) => (pairs[String(k + 1)] = letters[k]));
      out.push(
        base(mk(out.length + 1), "ETYMOLOGIE", "AUTO", {
          prompt: "Reliez chaque mot à son étymon.",
          payload: { left, right },
          solution: { pairs },
          commentary: "Étymologie (items générés depuis les origines du manuel).",
          groupSlug: window[0].slug,
        }),
      );
    }
    return out;
  },
  HOMOPHONIE: (groups, need, mk) => {
    const out: ExerciseItemContent[] = [];
    for (const g of binaryGroups(groups)) {
      if (out.length >= need) break;
      const a = g.words[0];
      const stem = a.headword.slice(0, Math.min(4, Math.max(2, a.headword.length - 3)));
      out.push(
        base(mk(out.length + 1), "HOMOPHONIE", "AUTO", {
          prompt: `${stem}……… [${a.definition}]`,
          payload: { hint: a.definition, stem },
          solution: { answer: a.headword, accentSensitive: true },
          commentary: `${a.headword} — orthographe exacte.`,
          groupSlug: g.slug,
          posClass: a.posClass,
        }),
      );
    }
    return out;
  },
  PAIRE_MINIMALE: (groups, need, mk) => {
    const out: ExerciseItemContent[] = [];
    for (const g of binaryGroups(groups)) {
      if (out.length >= need) break;
      const [a, b] = g.words;
      out.push(
        base(mk(out.length + 1), "PAIRE_MINIMALE", "AUTO", {
          prompt: blank(firstExample(a), a.headword),
          payload: { pair: [a.headword, b.headword], sentence: blank(firstExample(a), a.headword) },
          solution: { answer: a.headword, accentSensitive: false },
          commentary: `${a.headword} — ${a.definition}`,
          groupSlug: g.slug,
          posClass: a.posClass,
        }),
      );
    }
    return out;
  },
  PRODUCTION: (groups, need, mk) => {
    const out: ExerciseItemContent[] = [];
    for (const g of binaryGroups(groups)) {
      if (out.length >= need) break;
      const required = g.words.map((w) => w.headword);
      out.push(
        base(mk(out.length + 1), "PRODUCTION", "OPEN", {
          prompt: `Rédigez un court paragraphe employant correctement : ${required.join(", ")}.`,
          payload: { theme: g.title, required },
          solution: { criteria: g.summary },
          commentary: g.summary,
          groupSlug: g.slug,
        }),
      );
    }
    return out;
  },
  CATEGORISATION: (groups, need, mk) => {
    const out: ExerciseItemContent[] = [];
    const pool = groups
      .flatMap((g) => g.words)
      .filter((w) => ["NOM_M", "NOM_F", "ADJECTIF", "VERBE"].includes(w.posClass));
    const bins = [
      { id: "NOM_M", label: "Nom masculin" },
      { id: "NOM_F", label: "Nom féminin" },
      { id: "ADJECTIF", label: "Adjectif" },
      { id: "VERBE", label: "Verbe" },
    ];
    for (let i = 0; out.length < need && i + 8 <= pool.length; i += 8) {
      const window = pool.slice(i, i + 8);
      const assign: Record<string, string> = {};
      window.forEach((w) => (assign[w.headword] = w.posClass));
      out.push(
        base(mk(out.length + 1), "CATEGORISATION", "AUTO", {
          prompt: "Classez chaque terme dans sa catégorie grammaticale.",
          payload: { items: window.map((w) => w.headword), bins },
          solution: { assign },
          commentary: "Catégorisation (items générés depuis le manuel).",
        }),
      );
    }
    return out;
  },
  TRADUCTION: (groups, need, mk) => {
    const out: ExerciseItemContent[] = [];
    const withHy = groups.flatMap((g) =>
      g.words.filter((w) => w.translationHy.trim().length > 0).map((w) => ({ w, slug: g.slug })),
    );
    for (const { w, slug } of withHy) {
      if (out.length >= need) break;
      out.push(
        base(mk(out.length + 1), "TRADUCTION", "OPEN", {
          prompt: `Traduisez en arménien : « ${w.headword} ».`,
          payload: { source: w.headword, direction: "fr-hy" },
          solution: { model: w.translationHy, note: w.definition },
          commentary: `${w.headword} → ${w.translationHy}`,
          groupSlug: slug,
          posClass: w.posClass,
        }),
      );
    }
    return out;
  },
  COLLOCATION: (groups, need, mk) => {
    const out: ExerciseItemContent[] = [];
    const words = groups.flatMap((g) => g.words.map((w) => ({ w, slug: g.slug })));
    for (let i = 0; out.length < need && i < words.length; i += 4) {
      const window = words.slice(i, i + 4);
      if (window.length < 3) break;
      const left = window.map((x, k) => ({ id: String(k + 1), text: x.w.headword }));
      const letters = ["a", "b", "c", "d", "e"];
      const right = window.map((x, k) => ({ id: letters[k], text: `emploi : ${x.w.definition}` }));
      const pairs: Record<string, string> = {};
      window.forEach((_, k) => (pairs[String(k + 1)] = letters[k]));
      out.push(
        base(mk(out.length + 1), "COLLOCATION", "AUTO", {
          prompt: "Reliez chaque terme à son emploi caractéristique.",
          payload: { left, right },
          solution: { pairs },
          commentary: "Collocations (items générés depuis le manuel).",
          groupSlug: window[0].slug,
        }),
      );
    }
    return out;
  },
  DEVINETTE: (groups, need, mk) => {
    const out: ExerciseItemContent[] = [];
    for (const g of binaryGroups(groups)) {
      if (out.length >= need) break;
      const a = g.words[0];
      out.push(
        base(mk(out.length + 1), "DEVINETTE", "AUTO", {
          prompt: a.definition,
          payload: { definition: a.definition },
          solution: { answer: a.headword, accentSensitive: false },
          commentary: a.headword,
          groupSlug: g.slug,
          posClass: a.posClass,
        }),
      );
    }
    return out;
  },
  TEXTE_LACUNAIRE: (groups, need, mk) => {
    const out: ExerciseItemContent[] = [];
    const bg = binaryGroups(groups);
    for (let i = 0; out.length < need && i + 3 <= bg.length; i += 3) {
      const window = bg.slice(i, i + 3);
      const sentences: string[] = [];
      const blanks: { n: number; options: string[] }[] = [];
      const answers: string[] = [];
      window.forEach((g, k) => {
        const [a, b] = g.words;
        sentences.push(`(${k + 1}) ${blank(firstExample(a), a.headword)}`);
        blanks.push({ n: k + 1, options: [a.headword, b.headword] });
        answers.push(a.headword);
      });
      out.push(
        base(mk(out.length + 1), "TEXTE_LACUNAIRE", "AUTO", {
          prompt: "Complétez chaque passage par le paronyme qui convient.",
          payload: { text: sentences.join(" "), blanks },
          solution: { answers, accentSensitive: false },
          commentary: "Texte lacunaire (items générés depuis le manuel).",
          groupSlug: window[0].slug,
        }),
      );
    }
    return out;
  },
};

/**
 * Renvoie la liste complète : items réels + items générés pour atteindre
 * TARGET_PER_TYPE par typologie (dans la mesure où le pool de paronymes le permet).
 */
export function buildFullItemSet(
  realItems: ExerciseItemContent[],
  manualGroups: ManualGroupContent[],
): ExerciseItemContent[] {
  const full: ExerciseItemContent[] = [...realItems];
  for (const type of EXERCISE_TYPES) {
    const existing = full.filter((it) => it.type === type);
    const need = TARGET_PER_TYPE - existing.length;
    if (need <= 0) continue;
    const gen = generators[type];
    if (!gen) continue;
    const mk = (n: number) => `${type.toLowerCase()}-gen-${n}`;
    const generated = gen(manualGroups, need, mk).map((it, idx) => ({
      ...it,
      orderIndex: existing.length + idx + 1,
    }));
    full.push(...generated);
  }
  return full;
}
