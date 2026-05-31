import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { readFileSync } from "fs";

const withNextIntl = createNextIntlPlugin("./src/lib/i18n/request.ts");

/**
 * Version lue depuis package.json — fiable partout, y compris sur Vercel.
 * (On n'utilise PAS `git rev-list` : Vercel clone en shallow, le compte de
 * commits y est tronqué et resterait figé.)
 * À bumper à chaque livraison dans package.json → "version".
 */
function getAppVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync("./package.json", "utf8")) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: getAppVersion(),
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.fbcdn.net" },
      { protocol: "https", hostname: "platform-lookaside.fbsbx.com" },
    ],
  },
};

export default withNextIntl(nextConfig);
