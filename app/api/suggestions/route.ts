import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/server/db";
import { z } from "zod";

const schema = z.object({
  headword: z.string().min(1).max(200),
  context: z.string().min(1).max(1000),
  email: z.string().email().optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { headword, context, email } = parsed.data;

  await prisma.suggestion.create({
    data: {
      headword,
      context,
      email: email || null,
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
