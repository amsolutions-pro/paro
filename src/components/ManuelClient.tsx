"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/src/components/ui/Badge";
import { Card } from "@/src/components/ui/Card";
import { SuggestionForm } from "@/src/components/SuggestionForm";
import { BuildInfo } from "@/src/components/ui/BuildInfo";
import { trackDictView } from "@/src/lib/onboarding";

interface Word {
  id: string;
  headword: string;
  category: string;
  posClass: string;
  translationHy: string;
  definition: string;
  origin?: string | null;
  synonyms?: string | null;
  examples: string[];
  reviewNeeded?: boolean;
  autoFilled?: boolean;
}

interface Group {
  id: string;
  slug: string;
  title: string;
  letter: string;
  summary: string;
  words: Word[];
}

/**
 * Regroupe les lettres de façon à ce que chaque bouton représente environ
 * TARGET fiches — comme une pagination alphabétique.
 * - Lettres sans fiches : masquées.
 * - Une lettre seule ≥ TARGET obtient son propre bouton.
 * - Les petites lettres consécutives s'accumulent jusqu'à atteindre TARGET.
 */
const BUCKET_TARGET = 10;

function buildLetterBuckets(counts: Record<string, number>): { label: string; letters: string[] }[] {
  const present = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    .split("")
    .filter((l) => (counts[l] ?? 0) > 0);

  const buckets: { label: string; letters: string[] }[] = [];
  let current: string[] = [];
  let currentCount = 0;

  function emit() {
    if (current.length === 0) return;
    const label = current.length === 1
      ? current[0]
      : `${current[0]}-${current[current.length - 1]}`;
    buckets.push({ label, letters: [...current] });
    current = [];
    currentCount = 0;
  }

  for (const l of present) {
    const n = counts[l] ?? 0;
    if (n >= BUCKET_TARGET) {
      // Grande lettre : émet le bucket en cours, puis émet cette lettre seule
      emit();
      buckets.push({ label: l, letters: [l] });
    } else {
      current.push(l);
      currentCount += n;
      if (currentCount >= BUCKET_TARGET) emit();
    }
  }
  emit(); // reste éventuel

  return buckets;
}

const EXPAND_THRESHOLD = 200;

function ExpandableText({ text, className }: { text: string; className?: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > EXPAND_THRESHOLD;
  return (
    <span>
      <span className={!expanded && isLong ? "line-clamp-5" : className}>
        {text}
      </span>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="block text-lavande-600 hover:underline text-xs mt-0.5"
        >
          {expanded ? "Voir moins ▲" : "Voir plus ▼"}
        </button>
      )}
    </span>
  );
}

/** Separe "[IPA] · etymologie" → { ipa, etymology } */
function parseOrigin(origin: string): { ipa: string; etymology: string } {
  const m = origin.match(/^(\[.+?\])\s*·\s*(.+)$/);
  if (m) return { ipa: m[1], etymology: m[2] };
  return { ipa: "", etymology: origin };
}

/** Carte d'un mot — structure fr-hy ; les exemples sont controles par le groupe */
function WordCard({ word, showExamples }: { word: Word; showExamples: boolean }) {
  const { ipa, etymology } = word.origin ? parseOrigin(word.origin) : { ipa: "", etymology: "" };

  const needsReview = word.autoFilled || word.reviewNeeded;

  return (
    <div className={`rounded-lg border p-3 flex flex-col gap-2 ${needsReview ? "border-red-300 bg-red-50/40" : "border-grege-300"}`}>

      {/* En-tete : mot + categorie */}
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="font-serif text-base font-semibold">{word.headword}</span>
        {word.category && (
          <span className="text-encre-soft text-xs italic">{word.category}</span>
        )}
        {needsReview && (
          <span
            title="Traduction arménienne manquante ou à vérifier par un locuteur natif"
            className="ml-auto flex items-center gap-1 text-[10px] font-medium text-red-600 bg-red-100 border border-red-300 rounded px-1.5 py-0.5 shrink-0"
          >
            <span aria-hidden>⚑</span> à vérifier
          </span>
        )}
      </div>

      {/* Prononciation IPA + etymologie */}
      {word.origin && (
        <p className="text-encre-soft text-xs italic leading-snug">
          {ipa && <span className="font-mono not-italic text-lavande-600">{ipa}</span>}
          {ipa && " · "}
          {etymology}
        </p>
      )}

      {/* Definition */}
      <p className="text-encre text-sm leading-relaxed">{word.definition}</p>

      {/* Traduction armenienne */}
      {word.translationHy && (
        <div className="border-l-2 border-armenien pl-2 mt-1">
          <p lang="hy" className="hy text-sm font-medium text-armenien leading-relaxed">
            {word.translationHy}
          </p>
        </div>
      )}

      {/* Synonymes */}
      {word.synonyms && (
        <p className="text-encre-soft text-xs">
          <span className="font-medium">Syn. :</span> {word.synonyms}
        </p>
      )}

      {/* Exemples — affiches si le groupe a ouvert ses exemples */}
      {showExamples && word.examples.length > 0 && (
        <ul className="mt-1 space-y-1 pl-1 border-t border-grege-200 pt-2">
          {word.examples.map((ex, i) => (
            <li
              key={i}
              className="text-encre-soft text-xs font-serif italic before:content-['« '] after:content-[' »']"
            >
              {ex}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Table "Mise en regard" — synthese bilingue du groupe */
function MiseEnRegard({ words }: { words: Word[] }) {
  const withAr = words.filter((w) => w.translationHy);
  if (withAr.length < 2) return null;

  return (
    <div className="mt-1">
      <p className="text-encre text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-2">
        <span>Mise en regard</span>
        <span className="text-encre-soft font-normal normal-case tracking-normal">
          · synthese fr — hy
        </span>
      </p>
      <div className="overflow-x-auto rounded-lg border border-grege-300">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-grege-100 text-encre-soft">
              <th className="px-3 py-2 text-left font-medium">Français</th>
              <th className="px-3 py-2 text-left font-medium hidden sm:table-cell">
                Définition
              </th>
              <th className="px-3 py-2 text-left font-medium">
                <span lang="hy" className="hy text-armenien">
                  Հայերեն
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {words.map((w) => (
              <tr key={w.id} className="border-t border-grege-200 even:bg-grege-50">
                <td className="px-3 py-2 font-serif font-semibold align-top whitespace-nowrap">
                  {w.headword}
                  {w.category && (
                    <span className="ml-1 font-sans font-normal text-encre-soft italic">
                      {w.category}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-encre-soft align-top hidden sm:table-cell">
                  <ExpandableText text={w.definition} />
                </td>
                <td className="px-3 py-2 align-top">
                  {w.translationHy ? (
                    <span lang="hy" className="hy text-armenien font-medium">
                      {w.translationHy}
                    </span>
                  ) : (
                    <span className="text-encre-soft italic">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ManuelClient() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [total, setTotal] = useState(0);
  const [activeBucket, setActiveBucket] = useState<string[] | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [groupsWithExamples, setGroupsWithExamples] = useState<Set<string>>(new Set());
  const [letterCounts, setLetterCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    // En mode recherche : pas de filtre lettre (recherche globale)
    if (!debouncedSearch && activeBucket) {
      activeBucket.forEach((l) => params.append("letter", l));
    }
    if (debouncedSearch) params.set("search", debouncedSearch);
    fetch(`/api/manuel?${params}`)
      .then((r) => r.json())
      .then((data: { groups: Group[]; total: number; pages: number; letterCounts?: Record<string, number> }) => {
        if (!cancelled) {
          setGroups(data.groups);
          setTotal(data.total);
          setPages(data.pages);
          if (data.letterCounts) setLetterCounts(data.letterCounts);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeBucket, debouncedSearch, page]);

  function toggleGroup(id: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setGroupsWithExamples((prevEx) => {
          const nextEx = new Set(prevEx);
          nextEx.delete(id);
          return nextEx;
        });
      } else {
        next.add(id);
        trackDictView();
      }
      return next;
    });
  }

  function toggleGroupExamples(groupId: string) {
    setGroupsWithExamples((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }

  function selectBucket(letters: string[] | null) {
    setActiveBucket(letters);
    setPage(1);
    setSearch("");
    setDebouncedSearch("");
  }

  const buckets = buildLetterBuckets(letterCounts);
  const activeBucketKey = activeBucket ? activeBucket.join(",") : null;

  const hasExamplesInGroup = (g: Group) => g.words.some((w) => w.examples.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline gap-3">
        <h1 className="font-serif text-3xl font-bold">Dictionnaire des paronymes</h1>
        <BuildInfo />
      </div>

      {/* Barre de recherche */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          placeholder="Rechercher un paronyme…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
            if (e.target.value) setActiveBucket(null);
          }}
          className="border-grege-300 bg-grege-50 focus:border-lavande-500 w-full rounded-lg border px-3 py-2 text-sm outline-none sm:max-w-xs"
          aria-label="Rechercher dans le dictionnaire"
        />
        <span className="text-encre-soft text-sm">
          {total} fiche{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Intercalaires alphabetiques — uniquement les lettres ayant des fiches, groupées si peu de fiches */}
      {buckets.length > 0 && (
        <nav aria-label="Navigation alphabetique" className="flex flex-wrap gap-1">
          <button
            onClick={() => selectBucket(null)}
            className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
              activeBucketKey === null
                ? "bg-lavande-500 text-white"
                : "bg-grege-200 text-encre hover:bg-lavande-100"
            }`}
          >
            Tout
          </button>
          {buckets.map((b) => {
            const key = b.letters.join(",");
            const isActive = activeBucketKey === key;
            return (
              <button
                key={key}
                onClick={() => selectBucket(b.letters)}
                className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-lavande-500 text-white"
                    : "bg-grege-200 text-encre hover:bg-lavande-100"
                }`}
                aria-current={isActive ? "true" : undefined}
              >
                {b.label}
              </button>
            );
          })}
        </nav>
      )}

      {/* Liste des groupes */}
      {loading ? (
        <p className="text-encre-soft animate-pulse text-sm">Chargement…</p>
      ) : groups.length === 0 ? (
        <p className="text-encre-soft text-sm">Aucun résultat.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((g) => {
            const expanded = expandedGroups.has(g.id);
            const showExamples = groupsWithExamples.has(g.id);
            const hasEx = hasExamplesInGroup(g);

            return (
              <Card key={g.id}>
                {/* En-tete du groupe — accordeon principal */}
                <button
                  className="flex w-full items-start justify-between gap-3 text-left"
                  onClick={() => toggleGroup(g.id)}
                  aria-expanded={expanded}
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-serif text-lg font-semibold">{g.title}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {g.words.map((w) => (
                        <Badge
                          key={w.id}
                          variant={w.translationHy ? "armenien" : "default"}
                        >
                          {w.headword}
                          {w.category && (
                            <span className="ml-1 opacity-60 text-[10px]">
                              {w.category}
                            </span>
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <span
                    className="text-lavande-500 mt-1 shrink-0 text-sm"
                    aria-hidden
                  >
                    {expanded ? "▲" : "▼"}
                  </span>
                </button>

                {/* Corps du groupe */}
                {expanded && (
                  <div className="mt-4 flex flex-col gap-5">

                    {/* Cartes des mots vedettes */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      {g.words.map((w) => (
                        <WordCard
                          key={w.id}
                          word={w}
                          showExamples={showExamples}
                        />
                      ))}
                    </div>

                    {/* Bouton unique "Afficher / masquer les exemples" pour le groupe entier */}
                    {hasEx && (
                      <button
                        type="button"
                        onClick={() => toggleGroupExamples(g.id)}
                        className="self-start flex items-center gap-1.5 rounded-full border border-lavande-300 px-3 py-1 text-xs font-medium text-lavande-600 hover:bg-lavande-50 transition-colors"
                        aria-expanded={showExamples}
                      >
                        <span
                          className={`inline-block transition-transform duration-150 ${showExamples ? "rotate-90" : ""}`}
                          aria-hidden
                        >
                          ▶
                        </span>
                        {showExamples ? "Masquer les exemples" : "Afficher les exemples"}
                      </button>
                    )}

                    {/* Table Mise en regard */}
                    <MiseEnRegard words={g.words} />

                    {/* Encadre Le bon usage */}
                    <div className="border-lavande-300 bg-lavande-50 rounded-lg border-l-4 p-3">
                      <p className="text-lavande-700 text-xs font-semibold uppercase tracking-wide">
                        Le bon usage
                      </p>
                      <div className="text-encre mt-1 text-sm leading-relaxed">
                        <ExpandableText text={g.summary} />
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="border-grege-300 rounded border px-3 py-1.5 text-sm disabled:opacity-40"
          >
            ← Préc.
          </button>
          <span className="text-encre-soft py-1.5 text-sm">
            {page} / {pages}
          </span>
          <button
            disabled={page === pages}
            onClick={() => setPage((p) => p + 1)}
            className="border-grege-300 rounded border px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Suiv. →
          </button>
        </div>
      )}

      <SuggestionForm />
    </div>
  );
}
