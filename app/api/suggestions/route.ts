import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/server/db";
import { z } from "zod";
import { Resend } from "resend";

const schema = z.object({
  description: z.string().min(1).max(1000),
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

  const { description, email } = parsed.data;

  await prisma.suggestion.create({
    data: {
      headword: description.slice(0, 200),
      context: description,
      email: email || null,
    },
  });

  // Notification email si RESEND_API_KEY est configuré
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Paro <notifications@paro-xi.vercel.app>",
      to: "arsen.meliksetyan.solutions@gmail.com",
      subject: "Nouvelle proposition de paronyme",
      html: `
        <p><strong>Description :</strong></p>
        <blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#555">
          ${description.replace(/\n/g, "<br>")}
        </blockquote>
        ${email ? `<p><strong>Email de l'auteur :</strong> ${email}</p>` : "<p><em>Pas d'email fourni.</em></p>"}
      `,
    }).catch(() => {
      // L'email est best-effort — on ne fait pas échouer la requête si Resend est indisponible
    });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
