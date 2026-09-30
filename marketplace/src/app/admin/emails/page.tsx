import Link from "next/link";
import { retryEmail } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Emails" };

const STATUS: Record<string, string> = {
  sent: "bg-emerald-100 text-emerald-800",
  outbox: "bg-stone-100 text-stone-700",
  failed: "bg-red-100 text-red-700",
};

export default async function EmailsPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  await requireAdmin("/admin/emails");
  const { id } = await searchParams;
  const [emails, selected] = await Promise.all([
    db.emailLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    id ? db.emailLog.findUnique({ where: { id } }) : null,
  ]);
  const configured = Boolean(process.env.RESEND_API_KEY);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-sm text-brand">← Admin</Link>
        <h1 className="mt-1 font-display text-3xl font-bold">Emails</h1>
        {!configured && (
          <p className="mt-2 rounded-lg border border-dashed border-amber-400 bg-amber-50 p-3 text-sm text-amber-900">
            No email provider is set up, so emails are saved here (&ldquo;outbox&rdquo;) instead of being sent. Add a Resend API key to send them.
          </p>
        )}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <ul className="h-fit divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white text-sm">
          {emails.length === 0 && <li className="px-5 py-4 text-stone-500">No emails yet. Place an order to see one.</li>}
          {emails.map((m) => (
            <li key={m.id}>
              <Link href={`/admin/emails?id=${m.id}`} className={`block px-5 py-3 hover:bg-stone-50 ${m.id === id ? "bg-orange-50" : ""}`}>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS[m.status] ?? STATUS.outbox}`}>{m.status}</span>
                  <span className="truncate font-medium">{m.subject}</span>
                </div>
                <div className="mt-0.5 text-xs text-stone-500">
                  To {m.to} · {m.createdAt.toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" })}
                </div>
                {m.error && <div className="mt-1 text-xs text-red-600">{m.error}</div>}
              </Link>
            </li>
          ))}
        </ul>
        {selected ? (
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
            <div className="border-b border-stone-100 px-5 py-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{selected.subject}</div>
                  <div className="text-stone-500">To {selected.to}</div>
                </div>
                {configured && selected.status !== "sent" && !selected.sensitive && (
                  <form action={retryEmail}>
                    <input type="hidden" name="id" value={selected.id} />
                    <button className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white">
                      {selected.status === "failed" ? "Retry" : "Send now"}
                    </button>
                  </form>
                )}
              </div>
            </div>
            {/* Rendered in a sandboxed frame: the HTML is our own template, but it contains customer text. */}
            <iframe title="Email preview" sandbox="" srcDoc={selected.html} className="h-[720px] w-full" />
          </div>
        ) : (
          <p className="text-sm text-stone-500">Select an email to preview it.</p>
        )}
      </div>
    </div>
  );
}
