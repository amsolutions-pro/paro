import type { Metadata } from "next";
import { Noto_Sans, Noto_Serif, Noto_Sans_Armenian } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { SiteHeaderWithAuth } from "@/src/components/SiteHeaderWithAuth";
import "./globals.css";

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  display: "swap",
});

const notoSerif = Noto_Serif({
  variable: "--font-noto-serif",
  subsets: ["latin"],
  display: "swap",
});

// Police dédiée aux chaînes arméniennes (langue cible).
const notoArmenian = Noto_Sans_Armenian({
  variable: "--font-noto-armenian",
  subsets: ["armenian"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Paronymes FR–HY · niveau B2",
  description:
    "Manuel raisonné et exercices bilingues français–arménien sur les paronymes. Niveau B2.",
  metadataBase: new URL("https://paro-xi.vercel.app"),
  openGraph: {
    title: "Paronymes FR–HY · niveau B2",
    description:
      "Manuel raisonné et exercices bilingues français–arménien sur les paronymes. Niveau B2.",
    url: "https://paro-xi.vercel.app",
    siteName: "Paro",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Paronymes FR–HY · niveau B2",
    description:
      "Manuel raisonné et exercices bilingues français–arménien sur les paronymes. Niveau B2.",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${notoSans.variable} ${notoSerif.variable} ${notoArmenian.variable} h-full antialiased`}
    >
      <body className="bg-grege-100 text-encre flex min-h-full flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SiteHeaderWithAuth />
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">{children}</main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
