"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/Button";

type Status = "idle" | "sending" | "sent" | "error";

export function SuggestionForm() {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, email }),
      });
      if (!res.ok) throw new Error();
      setStatus("sent");
      setDescription("");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  function reset() {
    setStatus("idle");
    setOpen(false);
  }

  return (
    <div className="border-t border-grege-200 pt-6 mt-4">
      {!open ? (
        <div className="flex flex-col gap-2 items-start">
          <p className="text-encre-soft text-sm">
            Vous connaissez un paronyme absent du manuel ?
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-lavande-300 px-3 py-1 text-xs font-medium text-lavande-600 hover:bg-lavande-50 transition-colors"
          >
            <span aria-hidden>＋</span> Proposer un mot
          </button>
        </div>
      ) : status === "sent" ? (
        <div className="rounded-xl border-l-4 border-green-500 bg-green-50 p-4 flex flex-col gap-3">
          <p className="font-semibold text-green-800">✓ Merci pour votre proposition !</p>
          <p className="text-sm text-encre-soft">Nous l'examinerons prochainement.</p>
          <button
            type="button"
            onClick={reset}
            className="self-start text-xs text-encre-soft hover:text-encre underline-offset-2 hover:underline"
          >
            Fermer
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-lg">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-base font-semibold">Proposer un paronyme</h2>
            <button
              type="button"
              onClick={reset}
              aria-label="Fermer"
              className="text-encre-soft hover:text-encre text-lg leading-none"
            >
              ×
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-encre" htmlFor="sug-description">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="sug-description"
              required
              rows={4}
              placeholder="Mot(s) proposé(s), exemple d'usage, nuance à expliquer…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="border-grege-300 bg-grege-50 focus:border-lavande-500 rounded-lg border px-3 py-2 text-sm outline-none resize-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-encre" htmlFor="sug-email">
              Votre e-mail <span className="text-encre-soft font-normal">(facultatif, pour suivi)</span>
            </label>
            <input
              id="sug-email"
              type="email"
              placeholder="vous@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-grege-300 bg-grege-50 focus:border-lavande-500 rounded-lg border px-3 py-2 text-sm outline-none"
            />
          </div>

          {status === "error" && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-1.5">
              Une erreur est survenue. Veuillez réessayer.
            </p>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={status === "sending"}>
              {status === "sending" ? "Envoi…" : "Envoyer la proposition"}
            </Button>
            <Button type="button" variant="outline" onClick={reset}>
              Annuler
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
