import { anthropicApiKey, openaiApiKey, resolveProviderId } from "@/lib/ai/resolve";
import { mailConfig } from "@/lib/mailer";

export const runtime = "nodejs";

/** GET /api/status — integration flags. Never returns secrets. */
export async function GET() {
  const mail = mailConfig();
  return Response.json({
    provider: resolveProviderId(),
    openai: Boolean(openaiApiKey()),
    anthropic: Boolean(anthropicApiKey()),
    gmail: mail.configured,
    senderName: Boolean(process.env.SENDER_NAME),
    signature: Boolean(process.env.SENDER_SIGNATURE),
    from: mail.from ?? null,
    dailyCap: mail.dailyCap,
    sentToday: mail.sentToday,
  });
}
