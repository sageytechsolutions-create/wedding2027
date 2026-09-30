import { db } from "../db";

export interface Email {
  key: string; // unique per logical email, e.g. "shipped:<vendorOrderId>"
  to: string;
  subject: string;
  html: string;
  text: string;
}

// Sends through Resend when RESEND_API_KEY is set; otherwise the email is only
// stored (status "outbox") so it can be previewed in Admin → Emails.
// Never throws: a failed email must not break checkout or order updates.
export async function sendEmail(email: Email): Promise<void> {
  let log;
  try {
    // The unique key makes this the "already sent?" check, even across concurrent retries.
    log = await db.emailLog.create({ data: { ...email, status: "outbox" } });
  } catch {
    return; // already sent (or queued) once
  }

  await deliver(log);
}

// Sends a logged email through Resend, recording the outcome. Also used to retry failures.
export async function deliver(log: { id: string; key: string; to: string; subject: string; html: string; text: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json", "idempotency-key": log.key },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Local Legends <orders@example.com>",
        to: [log.to],
        reply_to: process.env.EMAIL_REPLY_TO || undefined,
        subject: log.subject,
        html: log.html,
        text: log.text,
      }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
    await db.emailLog.update({ where: { id: log.id }, data: { status: "sent", error: null } });
  } catch (e) {
    console.error("Email send failed", log.key, e);
    await db.emailLog.update({ where: { id: log.id }, data: { status: "failed", error: String(e).slice(0, 500) } });
  }
}
