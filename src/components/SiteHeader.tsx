"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { AuthButton } from "./AuthButton";

const LINKS = [
  { href: "/exercices", key: "exercices" as const },
  { href: "/manuel", key: "manuel" as const },
  { href: "/paronymie", key: "paronymie" as const },
  { href: "/revision", key: "revision" as const },
  { href: "/tableau-de-bord", key: "tableauDeBord" as const },
];

interface SiteHeaderProps {
  user?: { name?: string | null; email?: string | null; image?: string | null } | null;
  signInAction: () => Promise<void>;
  signOutAction: () => Promise<void>;
}

export function SiteHeader({ user, signInAction, signOutAction }: SiteHeaderProps) {
  const t = useTranslations("nav");
  const tApp = useTranslations("app");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <header className="border-grege-300 bg-grege-50/90 sticky top-0 z-30 border-b backdrop-blur">
      <nav
        aria-label="Navigation principale"
        className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-3 sm:px-6"
      >
        {/* Logo / titre */}
        <Link href="/" className="mr-auto flex items-baseline gap-2" onClick={() => setOpen(false)}>
          <span className="font-serif text-lg font-semibold tracking-tight">{tApp("title")}</span>
        </Link>

        {/* Liens desktop (sm+) */}
        <ul className="hidden sm:flex items-center gap-1">
          {LINKS.map(({ href, key }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
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

        {/* Auth button (desktop) */}
        <div className="hidden sm:block">
          <AuthButton user={user} signInAction={signInAction} signOutAction={signOutAction} />
        </div>

        {/* Bouton hamburger (mobile) */}
        <button
          className="sm:hidden flex flex-col justify-center items-center w-10 h-10 gap-1.5 rounded-md"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className={`block h-0.5 w-6 bg-encre transition-transform duration-200 ${open ? "translate-y-2 rotate-45" : ""}`} />
          <span className={`block h-0.5 w-6 bg-encre transition-opacity duration-200 ${open ? "opacity-0" : ""}`} />
          <span className={`block h-0.5 w-6 bg-encre transition-transform duration-200 ${open ? "-translate-y-2 -rotate-45" : ""}`} />
        </button>
      </nav>

      {/* Menu mobile deroulant */}
      {open && (
        <div className="sm:hidden border-t border-grege-300 bg-grege-50 px-4 pb-4">
          <ul className="flex flex-col gap-1 pt-2">
            {LINKS.map(({ href, key }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={[
                      "flex w-full rounded-lg px-4 py-3 text-base font-medium transition-colors",
                      active
                        ? "bg-lavande-500 text-white"
                        : "text-encre hover:bg-lavande-100",
                    ].join(" ")}
                  >
                    {t(key)}
                  </Link>
                </li>
              );
            })}
          </ul>
          {/* Auth button (mobile) */}
          <div className="mt-3 pt-3 border-t border-grege-200">
            <AuthButton user={user} signInAction={signInAction} signOutAction={signOutAction} />
          </div>
        </div>
      )}
    </header>
  );
}
