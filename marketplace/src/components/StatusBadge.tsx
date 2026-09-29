import { statusLabel } from "@/lib/orders";

const COLORS: Record<string, string> = {
  pending: "bg-stone-100 text-stone-700",
  preparing: "bg-amber-100 text-amber-800",
  shipped: "bg-sky-100 text-sky-800",
  out_for_delivery: "bg-indigo-100 text-indigo-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-700",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${COLORS[status] ?? COLORS.pending}`}>{statusLabel(status)}</span>;
}
