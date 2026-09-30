// Star rating display. Rounds to the nearest half star visually; the label is exact.
export function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const rounded = Math.round(rating * 2) / 2;
  return (
    <span role="img" aria-label={`${rating.toFixed(1)} out of 5 stars`} className={`inline-flex text-amber-500 ${size === "lg" ? "text-xl" : "text-sm"}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} aria-hidden className="relative">
          <span className="text-stone-300">★</span>
          {rounded >= i ? (
            <span className="absolute inset-0">★</span>
          ) : rounded === i - 0.5 ? (
            <span className="absolute inset-0 w-1/2 overflow-hidden">★</span>
          ) : null}
        </span>
      ))}
    </span>
  );
}
