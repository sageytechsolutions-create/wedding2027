export const KOSHER_TYPES = ["meat", "dairy", "pareve"] as const;
export type KosherType = (typeof KOSHER_TYPES)[number];

export const kosherLabels: Record<string, { label: string; className: string }> = {
  meat: { label: "Meat · Fleishig", className: "bg-red-100 text-red-800" },
  dairy: { label: "Dairy · Milchig", className: "bg-sky-100 text-sky-800" },
  pareve: { label: "Pareve", className: "bg-emerald-100 text-emerald-800" },
};
