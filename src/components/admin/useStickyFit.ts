import { useEffect, useRef } from "react";

/**
 * Keeps a sticky side column fully in view when it is taller than the screen, so it simply
 * scrolls along with the page instead of needing its own scrollbar. Same effect as the
 * Maisons (brand / category) create & edit page.
 *
 * Attach the returned ref to the column and give it `sticky top-[…]` — no max-height or
 * overflow is needed.
 */
export function useStickyFit<T extends HTMLElement = HTMLDivElement>(top = 83) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.top = `${Math.min(top, window.innerHeight - el.offsetHeight - 16)}px`;
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  });
  return ref;
}
