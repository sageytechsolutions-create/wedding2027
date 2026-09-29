import { KOSHER_LABELS, kosherLabels, parseLabels } from "@/lib/kosher";

export function KosherBadges({
  kosherType,
  kosherForPassover,
  labels = "",
}: {
  kosherType: string;
  kosherForPassover?: boolean;
  labels?: string;
}) {
  const k = kosherLabels[kosherType] ?? kosherLabels.pareve;
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${k.className}`}>{k.label}</span>
      {parseLabels(labels).map((l) => (
        <span key={l} className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700">{KOSHER_LABELS[l]}</span>
      ))}
      {kosherForPassover && (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Kosher for Passover</span>
      )}
    </span>
  );
}
