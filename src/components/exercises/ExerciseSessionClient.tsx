"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ExercisePlayer } from "@/src/components/exercises/ExercisePlayer";
import { Button } from "@/src/components/ui/Button";
import { Badge } from "@/src/components/ui/Badge";
import { type ExerciseType, type ExerciseTypeMeta } from "@/src/lib/exercise-types";
import { getUserId } from "@/src/lib/user-store";

interface Item {
  id: string;
  type: string;
  gradingMode: string;
  prompt: string;
  payload: unknown;
  solution: unknown;
  commentary: string;
  groupId: string | null;
}

interface SavedSession {
  items: Item[];
  currentIdx: number;
  score: number;
  exhausted: boolean;
  savedAt: number; // timestamp ms
}

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

function localKey(type: string) {
  return `paro:session:${type}`;
}

function loadLocal(type: string): SavedSession | null {
  try {
    const raw = localStorage.getItem(localKey(type));
    if (!raw) return null;
    const s = JSON.parse(raw) as SavedSession;
    if (Date.now() - s.savedAt > SESSION_TTL_MS) {
      localStorage.removeItem(localKey(type));
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

function saveLocal(type: string, s: SavedSession) {
  try {
    localStorage.setItem(localKey(type), JSON.stringify(s));
  } catch { /* quota dépassé — on ignore */ }
}

function clearLocal(type: string) {
  try { localStorage.removeItem(localKey(type)); } catch { /* */ }
}

// Vérifie si l'userId est un compte connecté (non-anonyme).
function isAuthenticated(userId: string): boolean {
  return !userId.startsWith("anon_");
}

export function ExerciseSessionClient({
  type,
  meta,
}: {
  type: ExerciseType;
  meta: ExerciseTypeMeta;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exhausted, setExhausted] = useState(false);
  const [maxVisited, setMaxVisited] = useState(0);

  // null = chargement en cours, SavedSession = session à proposer, false = pas de session
  const [pendingResume, setPendingResume] = useState<SavedSession | false | null>(null);

  const userId = getUserId();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Persistance ───────────────────────────────────────────────────────────

  const persistSession = useCallback((s: SavedSession) => {
    saveLocal(type, s);
    if (!isAuthenticated(userId)) return;
    // Debounce DB write : on attend 800ms d'inactivité avant d'écrire.
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      fetch("/api/session-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, sessionType: type, data: JSON.stringify(s) }),
      }).catch(() => { /* silencieux */ });
    }, 800);
  }, [type, userId]);

  const clearSession = useCallback(() => {
    clearLocal(type);
    if (!isAuthenticated(userId)) return;
    fetch(`/api/session-progress?userId=${encodeURIComponent(userId)}&sessionType=${encodeURIComponent(type)}`, {
      method: "DELETE",
    }).catch(() => { /* silencieux */ });
  }, [type, userId]);

  // ── Chargement initial ────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function init() {
      // 1. Chercher une session sauvegardée.
      let saved: SavedSession | null = null;

      // Utilisateur connecté : priorité à la DB (cross-device).
      if (isAuthenticated(userId)) {
        try {
          const res = await fetch(
            `/api/session-progress?userId=${encodeURIComponent(userId)}&sessionType=${encodeURIComponent(type)}`
          );
          const json = (await res.json()) as { progress: { data: string } | null };
          if (json.progress) {
            const dbSession = JSON.parse(json.progress.data) as SavedSession;
            if (Date.now() - dbSession.savedAt <= SESSION_TTL_MS) {
              saved = dbSession;
            }
          }
        } catch { /* silencieux */ }
      }

      // Fallback : localStorage.
      if (!saved) saved = loadLocal(type);

      if (cancelled) return;

      if (saved && saved.items.length > 0 && saved.currentIdx < saved.items.length) {
        setPendingResume(saved);
        setLoading(false);
        return;
      }

      // 2. Pas de session sauvegardée : charger depuis l'API.
      await fetchFresh(cancelled);
    }

    async function fetchFresh(cancelled: boolean) {
      const params = new URLSearchParams({ type, limit: "10" });
      params.set("userId", userId);
      try {
        const res = await fetch(`/api/exercices?${params}`);
        const d = (await res.json()) as { items: Item[]; exhausted?: boolean };
        if (!cancelled) {
          setItems(d.items);
          setExhausted(d.exhausted ?? false);
          setPendingResume(false);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  // Sauvegarde après chaque changement d'état de session actif.
  useEffect(() => {
    if (loading || pendingResume !== false || done || items.length === 0) return;
    persistSession({ items, currentIdx, score, exhausted, savedAt: Date.now() });
  }, [items, currentIdx, score, exhausted, done, loading, pendingResume, persistSession]);

  // ── Actions ───────────────────────────────────────────────────────────────

  function resumeSession(s: SavedSession) {
    setItems(s.items);
    setCurrentIdx(s.currentIdx);
    setScore(s.score);
    setExhausted(s.exhausted);
    setMaxVisited(s.currentIdx);
    setPendingResume(false);
  }

  async function startFresh() {
    clearSession();
    setPendingResume(false);
    setLoading(true);
    const params = new URLSearchParams({ type, limit: "10", userId });
    try {
      const res = await fetch(`/api/exercices?${params}`);
      const d = (await res.json()) as { items: Item[]; exhausted?: boolean };
      setItems(d.items);
      setExhausted(d.exhausted ?? false);
    } finally {
      setLoading(false);
    }
  }

  function handleResult(correct: boolean) {
    if (correct) setScore((s) => s + 1);
  }

  function handleNext() {
    const next = currentIdx + 1;
    if (next >= items.length) {
      setDone(true);
      clearSession();
    } else {
      setCurrentIdx(next);
      setMaxVisited((m) => Math.max(m, next));
    }
  }

  function handleBack() {
    if (currentIdx > 0) setCurrentIdx((i) => i - 1);
  }

  function handleRestart() {
    clearSession();
    setCurrentIdx(0);
    setScore(0);
    setDone(false);
    setMaxVisited(0);
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────

  if (loading) return <p className="text-encre-soft animate-pulse text-sm">Chargement…</p>;

  // Proposition de reprise
  if (pendingResume) {
    const s = pendingResume;
    const progress = Math.round(((s.currentIdx) / s.items.length) * 100);
    return (
      <div className="flex flex-col gap-6 max-w-md">
        <h1 className="font-serif text-2xl font-bold">{meta.label}</h1>
        <div className="rounded-xl border border-lavande-200 bg-lavande-50 p-5 flex flex-col gap-4">
          <div>
            <p className="font-medium text-encre text-sm">Session en cours</p>
            <p className="text-encre-soft text-xs mt-1">
              Question {s.currentIdx + 1} sur {s.items.length} — {s.score} bonne{s.score > 1 ? "s" : ""} réponse{s.score > 1 ? "s" : ""}
            </p>
          </div>
          {/* Barre de progression */}
          <div className="h-1.5 rounded-full bg-lavande-100 overflow-hidden">
            <div
              className="h-full bg-lavande-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex gap-3">
            <Button onClick={() => resumeSession(s)}>Reprendre →</Button>
            <Button variant="outline" onClick={startFresh}>Nouvelle session</Button>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0)
    return <p className="text-encre-soft text-sm">Aucun exercice disponible pour ce type.</p>;

  if (done) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-serif text-3xl font-bold">Session terminée</h1>
        <p className="text-encre-soft">
          Score : <strong>{score}</strong> / {items.length}
        </p>
        <div className="flex gap-3 flex-wrap">
          <Button onClick={handleRestart}>Recommencer</Button>
          <Button variant="outline" onClick={() => window.history.back()}>
            Retour aux exercices
          </Button>
        </div>
      </div>
    );
  }

  const item = items[currentIdx];
  const isReviewing = currentIdx < maxVisited;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="font-serif text-2xl font-bold">{meta.label}</h1>
          <Badge>{meta.defaultGrading === "AUTO" ? "Auto" : "Ouvert"}</Badge>
        </div>
        <span className="text-encre-soft text-sm">
          {currentIdx + 1} / {items.length}
        </span>
      </div>

      {exhausted && (
        <p className="text-xs text-lavande-600 bg-lavande-50 border border-lavande-200 rounded px-3 py-1.5">
          Vous avez déjà vu tous les exercices de ce type — sélection aléatoire depuis l'ensemble du catalogue.
        </p>
      )}

      {isReviewing && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-1.5">
          Mode révision — passage automatique désactivé
        </p>
      )}

      <ExercisePlayer
        key={item.id}
        item={item}
        onResult={handleResult}
        onNext={handleNext}
        onBack={handleBack}
        canGoBack={currentIdx > 0}
        noAutoAdvance={isReviewing}
      />
    </div>
  );
}
