"use client";
import { useEffect } from "react";

/**
 * Rendu uniquement lorsqu'une session authentifiée existe.
 * Au premier montage, transmet l'id anonyme (localStorage) à l'API de fusion
 * pour rattacher la progression locale au compte. Idempotent via un drapeau.
 */
export function IdentityMerge() {
  useEffect(() => {
    if (localStorage.getItem("paro-merged") === "1") return;
    let anonId: string | null = null;
    try {
      const raw = localStorage.getItem("paro-user");
      anonId = raw ? JSON.parse(raw)?.state?.userId ?? null : null;
    } catch {
      anonId = null;
    }
    if (!anonId) {
      localStorage.setItem("paro-merged", "1");
      return;
    }
    fetch("/api/identity/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anonId }),
    })
      .then(() => localStorage.setItem("paro-merged", "1"))
      .catch(() => {});
  }, []);

  return null;
}
