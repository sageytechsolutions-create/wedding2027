export const KOSHER_TYPES = ["meat", "dairy", "pareve"] as const;
export type KosherType = (typeof KOSHER_TYPES)[number];

export const kosherLabels: Record<string, { label: string; className: string }> = {
  meat: { label: "Meat · Fleishig", className: "bg-red-100 text-red-800" },
  dairy: { label: "Dairy · Milchig", className: "bg-sky-100 text-sky-800" },
  pareve: { label: "Pareve", className: "bg-emerald-100 text-emerald-800" },
};

// Stricter standards a product can be marked with. Stored as comma-separated keys on Product.labels.
export const KOSHER_LABELS = {
  glatt: "Glatt",
  "chassidishe-shechita": "Chassidishe Shechita",
  "cholov-yisroel": "Cholov Yisroel",
  "pas-yisroel": "Pas Yisroel",
  "bishul-yisroel": "Bishul Yisroel",
  yoshon: "Yoshon",
  "non-gebrokts": "Non-Gebrokts",
} as const;

export type KosherLabel = keyof typeof KOSHER_LABELS;

export function parseLabels(labels: string): KosherLabel[] {
  return labels.split(",").filter((l): l is KosherLabel => l in KOSHER_LABELS);
}
