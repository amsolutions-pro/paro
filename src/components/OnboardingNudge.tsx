"use client";

import { useState, useEffect, useCallback } from "react";
import { computeNextNudge, dismissNudge, type NudgeType } from "@/src/lib/onboarding";

const NUDGE_CONFIG: Record<
  NudgeType,
  { message: string; cta: string; href: string }
> = {
  dictionnaire: {
    message: "Plusieurs confusions — le dictionnaire peut aider.",
    cta: "Ouvrir le dictionnaire →",
    href: "/manuel",
  },
  paronymie: {
    message: "Vous consultez le dictionnaire : découvrez la théorie sur la paronymie.",
    cta: "Lire la théorie →",
    href: "/paronymie",
  },
  compte: {
    message: "Créez un compte pour sauvegarder votre progression.",
    cta: "Créer un compte →",
    href: "/auth/signin",
  },
};

export function OnboardingNudge({ isAuthed }: { isAuthed: boolean }) {
  const [nudge, setNudge] = useState<NudgeType | null>(null);

  const refresh = useCallback(() => {
    setNudge(computeNextNudge(isAuthed));
  }, [isAuthed]);

  useEffect(() => {
    refresh();
    window.addEventListener("paro:ob-update", refresh);
    return () => window.removeEventListener("paro:ob-update", refresh);
  }, [refresh]);

  if (!nudge) return null;

  const cfg = NUDGE_CONFIG[nudge];

  return (
    <div
      role="alert"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
    >
      <div className="bg-white border border-grege-300 rounded-xl shadow-lg px-4 py-3 flex items-start gap-3">
        <div className="flex-1">
          <p className="text-sm text-encre">{cfg.message}</p>
          <a
            href={cfg.href}
            className="inline-block mt-1.5 text-sm font-medium text-lavande-600 hover:underline"
          >
            {cfg.cta}
          </a>
        </div>
        <button
          aria-label="Fermer"
          onClick={() => {
            dismissNudge(nudge);
            setNudge(computeNextNudge(isAuthed));
          }}
          className="text-encre-soft hover:text-encre text-lg leading-none mt-0.5"
        >
          ×
        </button>
      </div>
    </div>
  );
}
