"use client";

import Link from "next/link";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="py-20 text-center">
      <div className="text-5xl">🥡</div>
      <h1 className="mt-4 font-display text-3xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-stone-600">Sorry about that. Please try again. If it keeps happening, let us know.</p>
      {error.digest && <p className="mt-1 text-xs text-stone-400">Reference: {error.digest}</p>}
      <div className="mt-6 flex justify-center gap-4">
        <button onClick={reset} className="rounded-full bg-brand px-5 py-2 font-medium text-white">Try again</button>
        <Link href="/" className="rounded-full border border-stone-300 px-5 py-2 font-medium">Home</Link>
      </div>
    </div>
  );
}
