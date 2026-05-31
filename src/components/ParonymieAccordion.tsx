"use client";

import { useState } from "react";

const SECTIONS = [
  {
    title: "La paronymie et les niveaux de langue",
    body: `La confusion de paronymes est plus fréquente dans les registres soutenu et technique, où le locuteur emploie des mots peu courants sans en maîtriser parfaitement la forme. En registre courant, la difficulté se concentre sur quelques paires à haute fréquence : infraction / effraction, conjecture / conjoncture, éminent / imminent. En registre spécialisé (droit, médecine, sciences), la densité de paronymes est bien plus élevée — et les enjeux de précision, bien plus grands.`,
  },
  {
    title: "Mécanismes phonétiques de la confusion",
    body: `Les confusions entre paronymes obéissent à des mécanismes prévisibles : substitution d'une consonne (collision / collusion : l → lu), ajout ou suppression d'une syllabe (répartir / repartir : pré- vs re-), inversion de phonèmes (prescription / proscription), et attraction paronymique — un mot peu fréquent est « attireé » vers un voisin plus courant. La connaissance de ces mécanismes permet d'anticiper les pièges plutôt que de les subir.`,
  },
  {
    title: "Paronymie et étymologie",
    body: `L'étymologie est la méthode la plus fiable pour distinguer deux paronymes. Prenons éminent (latin eminere, « s'élever ») et imminent (imminere, « surplomber, menacer ») : la lettre initiale — é- vs i- — reflète deux préfixes distincts. De même, abjurer (ab + jurare, « renier par serment ») s'oppose à adjurer (ad + jurare, « supplier au nom de Dieu »). Connaître les racines, c'est tenir le sens.`,
  },
  {
    title: "Paronymes en contexte bilingue français–arménien",
    body: `Pour un apprenant arménophone, la difficulté est double : il faut d'abord distinguer deux formes françaises proches, puis associer à chacune la traduction correcte. Or certaines paires françaises correspondent à deux termes arméniens phonétiquement distincts (éminent : ականavоr ; imminent : մоталут), tandis que d'autres n'ont qu'un seul équivalent arménien — ce qui masque la distinction et favorise la confusion. C'est pourquoi ce dictionnaire indique systématiquement les deux traductions.`,
  },
];

export function ParonymieAccordion() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-serif text-xl font-semibold">Pour aller plus loin</h2>
      {SECTIONS.map((s, i) => (
        <div key={i} className="border border-grege-300 rounded-xl overflow-hidden">
          <button
            className="flex w-full items-center justify-between px-4 py-3 text-left bg-grege-50 hover:bg-grege-100 transition-colors"
            onClick={() => setOpen(open === i ? null : i)}
            aria-expanded={open === i}
          >
            <span className="font-medium text-sm">{s.title}</span>
            <span className="text-lavande-500 text-sm" aria-hidden>
              {open === i ? "▲" : "▼"}
            </span>
          </button>
          {open === i && (
            <div className="px-4 py-3 text-sm text-encre leading-relaxed bg-white border-t border-grege-200">
              {s.body}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
