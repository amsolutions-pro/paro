import Link from "next/link";
import { useTranslations } from "next-intl";

export default function HomePage() {
  const t = useTranslations("home");
  const tCommon = useTranslations("common");

  const features = [
    { title: t("feature1Title"), body: t("feature1Body") },
    { title: t("feature2Title"), body: t("feature2Body") },
    { title: t("feature3Title"), body: t("feature3Body") },
  ];

  return (
    <div className="flex flex-col gap-16">
      <section className="flex flex-col items-start gap-6 pt-8">
        <span className="bg-armenien-soft text-armenien rounded-full px-3 py-1 text-sm font-medium">
          {tCommon("langueCible")}
        </span>
        <h1 className="font-serif text-4xl leading-tight font-bold text-balance sm:text-5xl">
          {t("heroTitle")}
        </h1>
        <p className="text-encre-soft max-w-2xl text-lg text-pretty">{t("heroSubtitle")}</p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/manuel"
            className="bg-lavande-500 hover:bg-lavande-700 rounded-lg px-5 py-2.5 font-medium text-white transition-colors"
          >
            {t("ctaManuel")}
          </Link>
          <Link
            href="/exercices"
            className="border-lavande-300 text-lavande-700 hover:bg-lavande-100 rounded-lg border px-5 py-2.5 font-medium transition-colors"
          >
            {t("ctaExercices")}
          </Link>
        </div>
      </section>

      <section className="grid gap-5 sm:grid-cols-3">
        {features.map((f) => (
          <article
            key={f.title}
            className="border-grege-300 bg-grege-50 rounded-xl border p-5 shadow-sm"
          >
            <h2 className="font-serif text-lg font-semibold">{f.title}</h2>
            <p className="text-encre-soft mt-2 text-sm leading-relaxed">{f.body}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
