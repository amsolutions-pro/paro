"use client";
import { useState, useId, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { Button } from "@/src/components/ui/Button";

interface Side { id: string; text: string }
interface Props {
  payload: unknown;
  onSubmit: (answer: unknown) => void;
  disabled: boolean;
  /** Résultat de l'API, transmis par ExercisePlayer après soumission. */
  result?: { correct: boolean; expected?: unknown } | null;
}

type Coords = { x1: number; y1: number; x2: number; y2: number };

export function AppariementRenderer({ payload, onSubmit, disabled, result }: Props) {
  const { left, right } = payload as { left: Side[]; right: Side[] };

  // Mélange la colonne droite une seule fois au montage
  const [shuffledRight] = useState(() => [...right].sort(() => Math.random() - 0.5));

  const [pairs, setPairs] = useState<Record<string, string>>({});
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [hoveredLid, setHoveredLid] = useState<string | null>(null);
  const [lines, setLines] = useState<Record<string, Coords>>({});
  const id = useId();

  const containerRef = useRef<HTMLDivElement>(null);
  const leftRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const rightRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // ── Calcul des coordonnées des fils ────────────────────────────────────────

  const recomputeLines = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const cr = container.getBoundingClientRect();
    const next: Record<string, Coords> = {};
    for (const [lid, rid] of Object.entries(pairs)) {
      const le = leftRefs.current.get(lid);
      const re = rightRefs.current.get(rid);
      if (!le || !re) continue;
      const lr = le.getBoundingClientRect();
      const rr = re.getBoundingClientRect();
      next[lid] = {
        x1: lr.right - cr.left,
        y1: lr.top + lr.height / 2 - cr.top,
        x2: rr.left - cr.left,
        y2: rr.top + rr.height / 2 - cr.top,
      };
    }
    setLines(next);
  }, [pairs]);

  // Recalcul après paint (useLayoutEffect évite le flash de position)
  useLayoutEffect(() => { recomputeLines(); }, [recomputeLines]);

  useEffect(() => {
    const obs = new ResizeObserver(recomputeLines);
    if (containerRef.current) obs.observe(containerRef.current);
    window.addEventListener("scroll", recomputeLines, true);
    return () => {
      obs.disconnect();
      window.removeEventListener("scroll", recomputeLines, true);
    };
  }, [recomputeLines]);

  // ── Correction post-validation ─────────────────────────────────────────────

  // Inversion de la solution : rightId → leftId
  const correctPairs: Record<string, string> | null = (() => {
    if (!result) return null;
    if (result.correct) return null; // tout est correct, pas besoin de détails
    if (!result.expected) return null;
    try { return JSON.parse(result.expected as string) as Record<string, string>; }
    catch { return null; }
  })();

  // null = pas encore de résultat, true/false = pair correcte/incorrecte
  function isPairCorrect(lid: string): boolean | null {
    if (!result) return null;
    if (result.correct) return true;
    if (!correctPairs) return null;
    return correctPairs[lid] === pairs[lid];
  }

  // Pour un rightId donné, quel leftId est la bonne association ?
  const correctByRight: Record<string, string> = correctPairs
    ? Object.fromEntries(Object.entries(correctPairs).map(([l, r]) => [r, l]))
    : {};

  // ── Interactions ───────────────────────────────────────────────────────────

  function handleLeftClick(lid: string) {
    if (disabled) return;
    setSelectedLeft((prev) => (prev === lid ? null : lid));
  }

  function handleRightClick(rid: string) {
    if (disabled || !selectedLeft) return;
    const currentOwner = Object.entries(pairs).find(([, r]) => r === rid)?.[0];
    setPairs((prev) => {
      const n = { ...prev };
      if (currentOwner) delete n[currentOwner]; // libère la définition si déjà utilisée
      n[selectedLeft] = rid;
      return n;
    });
    setSelectedLeft(null);
  }

  function removePair(lid: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (disabled) return;
    setPairs((prev) => { const n = { ...prev }; delete n[lid]; return n; });
    if (selectedLeft === lid) setSelectedLeft(null);
  }

  const allPaired = left.every((l) => pairs[l.id]);
  const remaining = left.filter((l) => !pairs[l.id]).length;

  // ── Couleurs des fils ──────────────────────────────────────────────────────

  function lineStroke(lid: string): string {
    if (!result) return hoveredLid === lid ? "#b45309" : "#f59e0b"; // amber
    const ok = isPairCorrect(lid);
    if (ok === true)  return "#16a34a"; // green-600
    if (ok === false) return "#dc2626"; // red-600
    return "#f59e0b";
  }

  // ── Rendu ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      {!disabled && (
        <p className="text-encre-soft text-xs">
          Cliquez un terme puis sa définition pour les associer.
          Recliquez un terme pour changer son association.
        </p>
      )}

      {/* Conteneur principal avec overlay SVG */}
      <div ref={containerRef} className="relative">

        {/* Fils de liaison — derrière les boutons */}
        <svg
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ width: "100%", height: "100%", overflow: "visible", zIndex: 0 }}
        >
          {Object.entries(pairs).map(([lid]) => {
            const c = lines[lid];
            if (!c) return null;
            const { x1, y1, x2, y2 } = c;
            const dx = Math.max(20, Math.abs(x2 - x1) * 0.35);
            const stroke = lineStroke(lid);
            const hovered = hoveredLid === lid;
            const pairOk = isPairCorrect(lid);

            return (
              <g key={lid}>
                <path
                  d={`M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={hovered ? 2.5 : 1.75}
                  opacity={0.85}
                  strokeLinecap="round"
                />
                {/* Indicateur ✓/✗ au centre du fil, après validation */}
                {result && pairOk !== null && (
                  <text
                    x={(x1 + x2) / 2}
                    y={(y1 + y2) / 2 - 5}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="bold"
                    fill={stroke}
                    aria-hidden
                  >
                    {pairOk ? "✓" : "✗"}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Grille deux colonnes, au-dessus du SVG */}
        <div className="relative grid grid-cols-2 gap-x-8 gap-y-2" style={{ zIndex: 1 }}>

          {/* Colonne gauche — Termes */}
          <div className="flex flex-col gap-2">
            {left.map((l) => {
              const rid = pairs[l.id];
              const isSelected = selectedLeft === l.id;
              const isPaired = !!rid;
              const pairOk = isPairCorrect(l.id);

              let cls = "border-grege-300 hover:bg-grege-200";
              if (result && pairOk === true)
                cls = "border-green-400 bg-green-50";
              else if (result && pairOk === false)
                cls = "border-red-400 bg-red-50";
              else if (isSelected)
                cls = "border-amber-500 bg-amber-50 ring-2 ring-amber-300 ring-offset-1";
              else if (isPaired)
                cls = "border-amber-400 bg-amber-50";

              return (
                <button
                  key={l.id}
                  ref={(el) => { if (el) leftRefs.current.set(l.id, el); else leftRefs.current.delete(l.id); }}
                  id={`${id}-l-${l.id}`}
                  onClick={() => handleLeftClick(l.id)}
                  onMouseEnter={() => isPaired && setHoveredLid(l.id)}
                  onMouseLeave={() => setHoveredLid(null)}
                  disabled={disabled}
                  aria-pressed={isSelected}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors flex items-center justify-between gap-2 ${cls}`}
                >
                  <span className="font-medium">{l.text}</span>
                  <span className="flex items-center gap-1 shrink-0">
                    {result && pairOk === true && (
                      <span className="text-green-600 text-xs font-bold" aria-label="correct">✓</span>
                    )}
                    {result && pairOk === false && (
                      <span className="text-red-600 text-xs font-bold" aria-label="incorrect">✗</span>
                    )}
                    {!disabled && isPaired && (
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={(e) => removePair(l.id, e)}
                        aria-label={`Défaire l'association de ${l.text}`}
                        className="ml-1 text-amber-500 hover:text-amber-800 text-base leading-none"
                      >
                        ×
                      </button>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Colonne droite — Définitions */}
          <div className="flex flex-col gap-2">
            {shuffledRight.map((r) => {
              const ownerLid = Object.entries(pairs).find(([, rid]) => rid === r.id)?.[0];
              const isUsed = !!ownerLid;
              const pairOk = ownerLid ? isPairCorrect(ownerLid) : null;
              const isAvailableTarget = !!selectedLeft && !isUsed;
              const correctLeftId = correctByRight[r.id];
              const correctLeftText = correctLeftId
                ? left.find((l) => l.id === correctLeftId)?.text
                : null;

              let cls = "border-grege-300";
              if (result && pairOk === true)
                cls = "border-green-400 bg-green-50";
              else if (result && pairOk === false)
                cls = "border-red-400 bg-red-50";
              else if (isUsed)
                cls = "border-amber-400 bg-amber-50 opacity-60";
              else if (isAvailableTarget)
                cls = "border-lavande-300 hover:bg-lavande-50 cursor-pointer";
              else if (selectedLeft)
                cls = "border-grege-300 hover:bg-grege-100 cursor-pointer";

              return (
                <button
                  key={r.id}
                  ref={(el) => { if (el) rightRefs.current.set(r.id, el); else rightRefs.current.delete(r.id); }}
                  id={`${id}-r-${r.id}`}
                  onClick={() => handleRightClick(r.id)}
                  onMouseEnter={() => ownerLid && setHoveredLid(ownerLid)}
                  onMouseLeave={() => setHoveredLid(null)}
                  disabled={disabled || (isUsed && ownerLid !== selectedLeft)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${cls}`}
                >
                  <span>{r.text}</span>
                  {/* Après validation incorrecte : affiche le bon terme */}
                  {result && pairOk === false && correctLeftText && (
                    <span className="block text-xs text-green-700 font-medium mt-0.5">
                      Attendu : {correctLeftText}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bouton Valider */}
      {!disabled && (
        <Button
          disabled={!allPaired}
          onClick={() => onSubmit({ pairs })}
        >
          {allPaired
            ? "Valider"
            : `Valider — ${remaining} association${remaining > 1 ? "s" : ""} restante${remaining > 1 ? "s" : ""}`}
        </Button>
      )}
    </div>
  );
}
