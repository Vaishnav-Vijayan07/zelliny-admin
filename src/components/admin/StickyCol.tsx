// Right-hand column that stays in view while the long left column scrolls. If it is taller than the
// screen, it scrolls until its last box is visible and then stays there.
import { useEffect, useRef, useState, type ReactNode } from "react";

export function StickyCol({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(83);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => setTop(Math.min(83, window.innerHeight - el.offsetHeight - 16));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    window.addEventListener("resize", fit);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, []);
  return (
    <div ref={ref} className="sticky min-w-0 self-start" style={{ top }}>
      {children}
    </div>
  );
}
