import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/server/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false });

  const country = req.headers.get("x-vercel-ip-country") ?? null;
  const city = decodeURIComponent(req.headers.get("x-vercel-ip-city") ?? "").replace(/\+/g, " ") || null;
  const ua = req.headers.get("user-agent") ?? "";
  const deviceType = /mobile|android|iphone|ipad|tablet/i.test(ua) ? "mobile" : "desktop";

  await prisma.user.update({
    where: { id: session.user.id },
    data: { country, city, deviceType, lastSeenAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
