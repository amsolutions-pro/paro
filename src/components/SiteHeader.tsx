"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

const LINKS = [
  { href: "/manuel", key: "manuel" as const },
  { href: "/exercices", key: "exercices" as const },
  { href: "/revision", key: "revision" as const },
  { href: "/tableau-de-bord", key: "tableauDeBord" as const },
];

/**
 * Barre persistante permettant de basculer instantanément entre Manuel,
 * Exercices, Révision et Tableau de bord (cf. §7 « navigation fluide »).
 */
export function SiteHeader() {
  const t = useTranslations("nav");
  const tApp = useTranslations("app");
  const pathname = usePathname();

  return (
    <header className="border-grege-300 bg-grege-50/80 sticky top-0 z-30 border-b backdrop-blur">
      <nav
        aria-label="Navigation principale"
        className="mx-auto flex w-full max-w-5xl items-center gap-2 px-4 py-3 sm:gap-4 sm:px-6"
      >
        <Link href="/" className="mr-auto flex items-baseline gap-2">
          <span className="font-serif text-lg font-semibold tracking-tight">{tApp("title")}</span>
        </Link>
        <ul className="flex items-center gap-1 sm:gap-2">
          {LINKS.map(({ href, key }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors sm:px-3",
                    active
                      ? "bg-lavande-500 text-white"
                      : "text-encre-soft hover:bg-lavande-100 hover:text-encre",
                  ].join(" ")}
                >
                  {t(key)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
