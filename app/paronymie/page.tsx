import Link from "next/link";
import { BuildInfo } from "@/src/components/ui/BuildInfo";
import { ParonymieAccordion } from "@/src/components/ParonymieAccordion";

export const metadata = {
  title: "La paronymie · Paronymes FR–HY",
  description:
    "Comprendre la paronymie : définition, mécanismes de confusion, méthodes de distinction. Niveau B2.",
};

export default function ParonymiePage() {
  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <div className="flex items-baseline gap-3">
        <h1 className="font-serif text-3xl font-bold">La paronymie</h1>
        <BuildInfo />
      </div>

      {/* Introduction */}
      <section className="flex flex-col gap-4">
        <p className="text-encre text-base leading-relaxed">
          La langue française est riche en subtilités, et la paronymie compte parmi les plus
          délicates. On appelle <strong>paronymes</strong> des mots dont la forme — sonore ou
          graphique — est très voisine, mais dont le sens diffère nettement : <em>abjurer</em> et{" "}
          <em>adjurer</em>, <em>éminent</em> et <em>imminent</em>, <em>accès</em> et{" "}
          <em>excès</em>. Une seule lettre, une syllabe déplacée, un ordre interverti suffisent à
          les séparer — et c&apos;est précisément cette quasi-ressemblance qui les rend trompeurs.
        </p>

        <div className="border-l-4 border-lavande-300 bg-lavande-50 px-4 py-3 rounded-r-lg">
          <p className="text-lavande-700 text-xs font-semibold uppercase tracking-wide mb-1">
            À ne pas confondre
          </p>
          <p className="text-encre text-sm leading-relaxed">
            Les <strong>homophones</strong> se prononcent exactement de la même manière (
            <em>verre, vers, vert</em>) ; les <strong>paronymes</strong>, eux, ne présentent
            qu&apos;une ressemblance phonétique partielle : <em>poisson</em> et <em>poison</em>,{" "}
            <em>éruption</em> et <em>irruption</em>, <em>coasser</em> et <em>croasser</em>. La
            différence, si ténue soit-elle, est bien réelle, à l&apos;oral comme à l&apos;écrit.
          </p>
        </div>

        <p className="text-encre text-base leading-relaxed">
          Pourquoi s&apos;y arrêter ? Parce que la confusion de deux paronymes ne produit pas une
          simple maladresse : elle altère le sens. Employer <em>adjurer</em> pour <em>abjurer</em>,
          c&apos;est dire le contraire de ce que l&apos;on pense ; confondre <em>infraction</em> et{" "}
          <em>effraction</em>, ou <em>prescription</em> et <em>proscription</em>, peut même
          emporter des conséquences juridiques. La maîtrise des paronymes est donc une condition de
          la précision — et la précision est la première des élégances.
        </p>
      </section>

      {/* Les trois clés */}
      <section className="flex flex-col gap-4">
        <h2 className="font-serif text-xl font-semibold">
          Trois clés pour distinguer les paronymes
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              num: "1",
              title: "La forme",
              body: "Repérer la lettre ou la syllabe qui sépare les deux termes : répartir / repartir, dénué / dénudé. Un regard attentif sur la graphie suffit souvent.",
            },
            {
              num: "2",
              title: "L'étymologie",
              body: "Bien des paronymes remontent à des racines distinctes. Connaître leur origine éclaire leur sens : addition (latin additio) n'a rien de commun avec adduction (adductio).",
            },
            {
              num: "3",
              title: "L'usage",
              body: "Observer les contextes, les constructions et les collocations dans lesquels chaque mot apparaît réellement. C'est l'usage qui tranche.",
            },
          ].map((k) => (
            <div
              key={k.num}
              className="border border-grege-300 bg-grege-50 rounded-xl p-4 flex flex-col gap-2"
            >
              <div className="flex items-center gap-2">
                <span className="bg-lavande-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">
                  {k.num}
                </span>
                <h3 className="font-serif font-semibold">{k.title}</h3>
              </div>
              <p className="text-encre-soft text-sm leading-relaxed">{k.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Accordion "Pour aller plus loin" */}
      <ParonymieAccordion />

      {/* CTA */}
      <section className="border-grege-300 bg-grege-50 rounded-xl border p-5 flex flex-col gap-3">
        <h2 className="font-serif text-lg font-semibold">Pratiquer maintenant</h2>
        <p className="text-encre-soft text-sm">
          La théorie ne suffit pas : c&apos;est en context que les distinctions se fixent. Vingt
          typologies d&apos;exercices vous attendent.
        </p>
        <div className="flex gap-3 flex-wrap">
          <Link
            href="/exercices"
            className="bg-lavande-500 hover:bg-lavande-700 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
          >
            Commencer les exercices →
          </Link>
          <Link
            href="/manuel"
            className="border-lavande-300 text-lavande-700 hover:bg-lavande-100 rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
          >
            Ouvrir le dictionnaire
          </Link>
        </div>
      </section>
    </div>
  );
}
