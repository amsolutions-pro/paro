import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/lib/i18n/request.ts");

const nextConfig: NextConfig = {
  // SQLite + Prisma en dev ; rien de spécial ici pour l'instant.
};

export default withNextIntl(nextConfig);
