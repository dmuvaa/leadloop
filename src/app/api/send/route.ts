import { NextRequest } from "next/server";
import { z } from "zod";
import { MailError, mailConfig, sendMail } from "@/lib/mailer";

export const runtime = "nodejs";

const Body = z.object({
  to: z.string().email("Enter a valid recipient email."),
  toName: z.string().optional(),
  subject: z.string().min(1),
  body: z.string().min(20),
});

/** GET /api/send — is Gmail connected, and how much of today's cap is used. */
export async function GET() {
  return Response.json(mailConfig());
}

/** POST /api/send — send one approved email through Gmail SMTP. */
export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid email details." }, { status: 400 });
  }
  try {
    const { messageId } = await sendMail(parsed.data);
    return Response.json({ ok: true, messageId, sentAt: new Date().toISOString(), config: mailConfig() });
  } catch (err) {
    if (err instanceof MailError) return Response.json({ error: err.message }, { status: err.status });
    console.error("[send] failed", err);
    return Response.json({ error: "Sending failed. Try again." }, { status: 502 });
  }
}
