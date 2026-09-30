"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// A horizontally scrolling row with arrow buttons (swipe on phones).
export function Carousel({ label, children }: { label: string; children: React.ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  // Only show an arrow when there's more to scroll that way.
  const update = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);
  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [update]);
  const scroll = (dir: 1 | -1) => track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.8, behavior: "smooth" });
  return (
    <div className="relative">
      <div
        ref={track}
        onScroll={update}
        role="region"
        aria-label={label}
        className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      {!edges.start && (
      <button
        type="button"
        onClick={() => scroll(-1)}
        aria-label={`Scroll ${label} left`}
        className="absolute -left-5 top-1/3 hidden h-11 w-11 items-center justify-center rounded-full border border-stone-200 bg-white text-xl shadow-md hover:bg-stone-50 md:flex"
      >
        ‹
      </button>
      )}
      {!edges.end && (
      <button
        type="button"
        onClick={() => scroll(1)}
        aria-label={`Scroll ${label} right`}
        className="absolute -right-5 top-1/3 hidden h-11 w-11 items-center justify-center rounded-full border border-stone-200 bg-white text-xl shadow-md hover:bg-stone-50 md:flex"
      >
        ›
      </button>
      )}
    </div>
  );
}

export function CarouselItem({ children, className = "w-64" }: { children: React.ReactNode; className?: string }) {
  return <div className={`shrink-0 snap-start ${className}`}>{children}</div>;
}
