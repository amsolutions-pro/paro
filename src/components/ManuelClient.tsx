"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/src/components/ui/Badge";
import { Card } from "@/src/components/ui/Card";

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
  reviewNeeded: boolean;
}

interface Group {
  id: string;
  slug: string;
  title: string;
  letter: string;
  summary: string;
  words: Word[];
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/** Sépare "[IPA] · étymologie" → { ipa, etymology } */
function parseOrigin(origin: string): { ipa: string; etymology: string } {
  const m = origin.match(/^(\[.+?\])\s*·\s*(.+)$/);
  if (m) return { ipa: m[1], etymology: m[2] };
  return { ipa: "", etymology: origin };
}

/** Carte d'un mot — suit la structure du manuel fr-hy */
function WordCard({ word, showExamples, onToggleExamples }: {
  word: Word;
  showExamples: boolean;
  onToggleExamples: () => void;
}) {
  const { ipa, etymology } = word.origin ? parseOrigin(word.origin) : { ipa: "", etymology: "" };
  const hasExamples = word.examples.length > 0;

  return (
    <div className="border-grege-300 rounded-lg border p-3 flex flex-col gap-2">

      {/* ① En-tête : mot + catégorie */}
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="font-serif text-base font-semibold">{word.headword}</span>
        {word.category && (
          <span className="text-encre-soft text-xs italic">{word.category}</span>
        )}
      </div>

      {/* ② Prononciation IPA + étymologie */}
      {word.origin && (
        <p className="text-encre-soft text-xs italic leading-snug">
          {ipa && <span className="font-mono not-italic text-lavande-600">{ipa}</span>}
          {ipa && " · "}
          {etymology}
        </p>
      )}

      {/* ③ Définition */}
      <p className="text-encre text-sm leading-relaxed">{word.definition}</p>

      {/* ④ Traduction arménienne — mise en valeur */}
      {word.translationHy && (
        <div className="border-l-2 border-armenien pl-2 mt-1">
          <p lang="hy" className="hy text-sm font-medium text-armenien leading-relaxed">
            {word.translationHy}
          </p>
        </div>
      )}

      {/* ⑤ Synonymes */}
      {word.synonyms && (
        <p className="text-encre-soft text-xs">
          <span className="font-medium">Syn. :</span> {word.synonyms}
        </p>
      )}

      {/* ⑥ Accordéon exemples */}
      {hasExamples && (
        <div>
          <button
            type="button"
            onClick={onToggleExamples}
            className="text-lavande-500 hover:text-lavande-700 flex items-center gap-1 text-xs font-medium transition-colors"
            aria-expanded={showExamples}
          >
            <span
              className={`inline-block transition-transform duration-150 ${showExamples ? "rotate-90" : ""}`}
              aria-hidden
            >
              ▶
            </span>
            {showExamples ? "Masquer les exemples" : "Voir les exemples"}
          </button>

          {showExamples && (
            <ul className="mt-2 space-y-1 pl-1">
              {word.examples.map((ex, i) => (
                <li key={i} className="text-encre-soft text-xs font-serif italic before:content-['« '] after:content-[' »']">
                  {ex}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/** Table « Mise en regard » — synthèse bilingue du groupe */
function MiseEnRegard({ words }: { words: Word[] }) {
  const withAr = words.filter(w => w.translationHy);
  if (withAr.length < 2) return null;

  return (
    <div className="mt-1">
      <p className="text-encre text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-2">
        <span lang="hy" className="hy text-armenien">Mise en regard</span>
        <span className="text-encre-soft font-normal normal-case tracking-normal">· synthèse fr — hy</span>
      </p>
      <div className="overflow-x-auto rounded-lg border border-grege-300">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-grege-100 text-encre-soft">
              <th className="px-3 py-2 text-left font-medium">Français</th>
              <th className="px-3 py-2 text-left font-medium hidden sm:table-cell">Définition</th>
              <th className="px-3 py-2 text-left font-medium">
                <span lang="hy" className="hy text-armenien">Հայերեն</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {words.map((w) => (
              <tr key={w.id} className="border-t border-grege-200 even:bg-grege-50">
                <td className="px-3 py-2 font-serif font-semibold align-top whitespace-nowrap">
                  {w.headword}
                  {w.category && (
                    <span className="ml-1 font-sans font-normal text-encre-soft italic">{w.category}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-encre-soft align-top hidden sm:table-cell">
                  {w.definition.split(/[.;]/)[0].trim()}
                </td>
                <td className="px-3 py-2 align-top">
                  {w.translationHy ? (
                    <span lang="hy" className="hy text-armenien font-medium">{w.translationHy}</span>
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
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedExamples, setExpandedExamples] = useState<Set<string>>(new Set());

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (activeLetter) params.set("letter", activeLetter);
    if (debouncedSearch) params.set("search", debouncedSearch);
    fetch(`/api/manuel?${params}`)
      .then((r) => r.json())
      .then((data: { groups: Group[]; total: number; pages: number }) => {
        if (!cancelled) {
          setGroups(data.groups);
          setTotal(data.total);
          setPages(data.pages);
          setLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeLetter, debouncedSearch, page]);

  function toggleGroup(id: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  function toggleExamples(wordId: string) {
    setExpandedExamples((prev) => {
      const next = new Set(prev);
      if (next.has(wordId)) { next.delete(wordId); } else { next.add(wordId); }
      return next;
    });
  }

  function selectLetter(l: string | null) {
    setActiveLetter(l);
    setPage(1);
    setSearch("");
    setDebouncedSearch("");
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-3xl font-bold">Manuel des paronymes</h1>

      {/* Barre de recherche */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          placeholder="Rechercher un paronyme…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="border-grege-300 bg-grege-50 focus:border-lavande-500 w-full rounded-lg border px-3 py-2 text-sm outline-none sm:max-w-xs"
          aria-label="Rechercher dans le manuel"
        />
        <span className="text-encre-soft text-sm">{total} groupe{total !== 1 ? "s" : ""}</span>
      </div>

      {/* Intercalaires alphabétiques */}
      <nav aria-label="Navigation alphabétique" className="flex flex-wrap gap-1">
        <button
          onClick={() => selectLetter(null)}
          className={`rounded px-2 py-1 text-xs font-medium transition-colors ${activeLetter === null ? "bg-lavande-500 text-white" : "bg-grege-200 text-encre hover:bg-lavande-100"}`}
        >
          Tout
        </button>
        {LETTERS.map((l) => (
          <button
            key={l}
            onClick={() => selectLetter(l)}
            className={`rounded px-2 py-1 text-xs font-medium transition-colors ${activeLetter === l ? "bg-lavande-500 text-white" : "bg-grege-200 text-encre hover:bg-lavande-100"}`}
            aria-current={activeLetter === l ? "true" : undefined}
          >
            {l}
          </button>
        ))}
      </nav>

      {/* Liste des groupes */}
      {loading ? (
        <p className="text-encre-soft animate-pulse text-sm">Chargement…</p>
      ) : groups.length === 0 ? (
        <p className="text-encre-soft text-sm">Aucun résultat.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((g) => {
            const expanded = expandedGroups.has(g.id);
            return (
              <Card key={g.id}>
                {/* En-tête du groupe — accordéon principal */}
                <button
                  className="flex w-full items-start justify-between gap-3 text-left"
                  onClick={() => toggleGroup(g.id)}
                  aria-expanded={expanded}
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-serif text-lg font-semibold">{g.title}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {g.words.map((w) => (
                        <Badge key={w.id} variant={w.translationHy ? "armenien" : "default"}>
                          {w.headword}
                          {w.category && <span className="ml-1 opacity-60 text-[10px]">{w.category}</span>}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <span className="text-lavande-500 mt-1 shrink-0 text-sm" aria-hidden>
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
                          showExamples={expandedExamples.has(w.id)}
                          onToggleExamples={() => toggleExamples(w.id)}
                        />
                      ))}
                    </div>

                    {/* Table Mise en regard */}
                    <MiseEnRegard words={g.words} />

                    {/* Encadré Le bon usage */}
                    <div className="border-lavande-300 bg-lavande-50 rounded-lg border-l-4 p-3">
                      <p className="text-lavande-700 text-xs font-semibold uppercase tracking-wide">
                        Le bon usage
                      </p>
                      <p className="text-encre mt-1 text-sm leading-relaxed">{g.summary}</p>
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
    </div>
  );
}
