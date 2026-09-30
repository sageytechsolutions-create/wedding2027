import { site } from "@/lib/config";

// Shared layout for the Terms, Privacy and Shipping & Refunds pages.
export function PolicyPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl">
      <h1 className="font-display text-4xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-stone-500">Last updated {updated}</p>
      <div className="mt-8 space-y-4 leading-relaxed text-stone-700 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-stone-900 [&_li]:ml-5 [&_li]:list-disc [&_a]:text-brand">
        {children}
      </div>
      <p className="mt-10 text-sm text-stone-500">
        Questions? Email <a href={`mailto:${site.supportEmail}`} className="text-brand">{site.supportEmail}</a>.
      </p>
    </article>
  );
}
