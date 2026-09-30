"use client";

import { useState } from "react";
import { ProductImage } from "./ProductCard";
import { photoUrl } from "@/lib/photos";

export function ProductGallery({
  name,
  emoji,
  accent,
  photoIds,
  fallbackUrl,
}: {
  name: string;
  emoji: string;
  accent: string;
  photoIds: string[];
  fallbackUrl: string | null;
}) {
  const [current, setCurrent] = useState(0);
  const main = photoIds.length ? photoUrl(photoIds[Math.min(current, photoIds.length - 1)], "large") : fallbackUrl;

  return (
    <div className="space-y-3">
      <div className="aspect-square overflow-hidden rounded-3xl">
        <ProductImage emoji={emoji} imageUrl={main} alt={name} accent={accent} className="text-9xl" />
      </div>
      {photoIds.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {photoIds.map((id, i) => (
            <button
              key={id}
              type="button"
              onClick={() => setCurrent(i)}
              aria-label={`Show photo ${i + 1} of ${photoIds.length}`}
              aria-current={i === current}
              className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 ${i === current ? "border-brand" : "border-transparent opacity-70 hover:opacity-100"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl(id)} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
