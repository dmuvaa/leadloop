import nodemailer from "nodemailer";

/**
 * Gmail SMTP sender. Uses an App Password (requires 2-step verification on the
 * Google account). Nothing is sent unless the user explicitly clicks Send on an
 * approved email; there is no unattended sending.
 */

export type MailConfig = {
  configured: boolean;
  from?: string;
  senderName?: string;
  dailyCap: number;
  sentToday: number;
};

const DAILY_CAP = Number(process.env.SEND_DAILY_CAP ?? 20);

// In-memory daily counter. Resets when the date changes or the server restarts.
let counter = { day: today(), count: 0 };
function today() {
  return new Date().toISOString().slice(0, 10);
}
function bump() {
  if (counter.day !== today()) counter = { day: today(), count: 0 };
  counter.count++;
}
export function sentToday() {
  if (counter.day !== today()) counter = { day: today(), count: 0 };
  return counter.count;
}

export function mailConfig(): MailConfig {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  return {
    configured: Boolean(user && pass),
    from: user,
    senderName: process.env.SENDER_NAME || undefined,
    dailyCap: DAILY_CAP,
    sentToday: sentToday(),
  };
}

export class MailError extends Error {
  constructor(message: string, public readonly status = 502) {
    super(message);
    this.name = "MailError";
  }
}

/**
 * Finalises the drafted body for a real recipient:
 * - "Hi there," → "Hi <first name>," when a name is known
 * - "[Your name]" → SENDER_NAME
 * - appends SENDER_SIGNATURE (postal address / opt-out line) when set
 */
export function finalizeBody(body: string, recipientName?: string) {
  let out = body;
  const first = recipientName?.trim().split(/\s+/)[0];
  if (first) out = out.replace(/^Hi there,/m, `Hi ${first},`);
  const sender = process.env.SENDER_NAME;
  if (sender) out = out.replace(/\[Your name\]/g, sender);
  const sig = process.env.SENDER_SIGNATURE;
  if (sig) out = `${out.trimEnd()}\n\n${sig}`;
  return out;
}

export async function sendMail(input: { to: string; toName?: string; subject: string; body: string }) {
  const cfg = mailConfig();
  if (!cfg.configured) throw new MailError("Gmail is not connected. Set GMAIL_USER and GMAIL_APP_PASSWORD in .env.local and restart.", 503);
  if (cfg.sentToday >= cfg.dailyCap) throw new MailError(`Daily send cap of ${cfg.dailyCap} reached. Raise SEND_DAILY_CAP if you really mean it.`, 429);

  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });

  try {
    const info = await transport.sendMail({
      from: cfg.senderName ? { name: cfg.senderName, address: cfg.from! } : cfg.from,
      to: input.toName ? { name: input.toName, address: input.to } : input.to,
      subject: input.subject,
      text: finalizeBody(input.body, input.toName),
    });
    bump();
    return { messageId: info.messageId as string | undefined };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (/invalid login|username and password not accepted|535/i.test(msg))
      throw new MailError("Gmail rejected the login. Use an App Password (not your normal password) and check GMAIL_USER.", 502);
    if (/ECONNECTION|ETIMEDOUT|ENOTFOUND|ECONNREFUSED/i.test(msg)) throw new MailError("Could not reach Gmail's SMTP server.", 502);
    throw new MailError("Sending failed. Try again.", 502);
  }
}
