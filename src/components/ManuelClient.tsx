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

  // Debounce recherche.
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
                          {w.category && <span className="ml-1 opacity-70">{w.category}</span>}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <span className="text-lavande-500 mt-1 text-sm" aria-hidden>
                    {expanded ? "▲" : "▼"}
                  </span>
                </button>

                {expanded && (
                  <div className="mt-4 flex flex-col gap-4">
                    {/* Mots vedettes */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      {g.words.map((w) => (
                        <div key={w.id} className="border-grege-300 rounded-lg border p-3">
                          <div className="flex items-baseline gap-2">
                            <span className="font-serif text-base font-semibold">{w.headword}</span>
                            <span className="text-encre-soft text-xs">{w.category}</span>
                          </div>
                          {w.translationHy && (
                            <p lang="hy" className="hy mt-1 text-sm">
                              {w.translationHy}
                            </p>
                          )}
                          <p className="text-encre-soft mt-1 text-sm">{w.definition}</p>
                          {w.origin && (
                            <p className="text-encre-soft mt-1 text-xs italic">{w.origin}</p>
                          )}
                          {w.examples.length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {w.examples.map((ex, i) => (
                                <li key={i} className="text-encre-soft text-xs">
                                  « {ex} »
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                    {/* Encadré Le bon usage */}
                    <div className="border-lavande-300 bg-lavande-100 rounded-lg border-l-4 p-3">
                      <p className="text-encre text-xs font-semibold uppercase tracking-wide">
                        Le bon usage
                      </p>
                      <p className="text-encre mt-1 text-sm">{g.summary}</p>
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
