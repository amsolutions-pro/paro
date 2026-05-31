/** Suivi de progression pour l'onboarding des nouveaux visiteurs. */

const KEYS = {
  errors: "paro:ob-errors",
  dictViews: "paro:ob-dict-views",
  nudgeDone: "paro:ob-nudge",
} as const;

export type NudgeType = "dictionnaire" | "paronymie" | "compte";

export function trackError() {
  if (typeof window === "undefined") return;
  const n = parseInt(localStorage.getItem(KEYS.errors) ?? "0", 10) + 1;
  localStorage.setItem(KEYS.errors, String(n));
  window.dispatchEvent(new CustomEvent("paro:ob-update"));
}

export function trackDictView() {
  if (typeof window === "undefined") return;
  const n = parseInt(localStorage.getItem(KEYS.dictViews) ?? "0", 10) + 1;
  localStorage.setItem(KEYS.dictViews, String(n));
  window.dispatchEvent(new CustomEvent("paro:ob-update"));
}

export function dismissNudge(type: NudgeType) {
  if (typeof window === "undefined") return;
  const done = JSON.parse(localStorage.getItem(KEYS.nudgeDone) ?? "[]") as NudgeType[];
  if (!done.includes(type)) {
    localStorage.setItem(KEYS.nudgeDone, JSON.stringify([...done, type]));
  }
}

export function computeNextNudge(isAuthed: boolean): NudgeType | null {
  if (typeof window === "undefined") return null;
  const errors = parseInt(localStorage.getItem(KEYS.errors) ?? "0", 10);
  const dictViews = parseInt(localStorage.getItem(KEYS.dictViews) ?? "0", 10);
  const done = JSON.parse(localStorage.getItem(KEYS.nudgeDone) ?? "[]") as NudgeType[];

  if (errors >= 3 && !done.includes("dictionnaire")) return "dictionnaire";
  if (dictViews >= 3 && !done.includes("paronymie")) return "paronymie";
  if (dictViews >= 2 && !isAuthed && !done.includes("compte")) return "compte";
  return null;
}
