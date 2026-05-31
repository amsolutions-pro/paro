import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { execSync } from "child_process";

const withNextIntl = createNextIntlPlugin("./src/lib/i18n/request.ts");

function getCommitCount(): number {
  try {
    return parseInt(execSync("git rev-list --count HEAD").toString().trim(), 10);
  } catch {
    return 0;
  }
}

function getAppVersion(): string {
  const count = getCommitCount();
  return `0.${count}.0`;
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
