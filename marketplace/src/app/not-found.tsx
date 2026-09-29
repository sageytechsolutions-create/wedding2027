import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <div className="text-5xl">🥡</div>
      <h1 className="mt-4 font-display text-3xl font-bold">We couldn&apos;t find that</h1>
      <Link href="/" className="mt-6 inline-block text-brand">Back home →</Link>
    </div>
  );
}
