import { kosherLabels } from "@/lib/kosher";

export function KosherBadges({ kosherType, kosherForPassover }: { kosherType: string; kosherForPassover?: boolean }) {
  const k = kosherLabels[kosherType] ?? kosherLabels.pareve;
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${k.className}`}>{k.label}</span>
      {kosherForPassover && (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Kosher for Passover</span>
      )}
    </span>
  );
}
