import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/api/types";

const toneClass: Record<Tone, string> = {
  ok: "text-good bg-good-bg",
  warn: "text-warn bg-warn-bg",
  bad: "text-bad bg-bad-bg",
  info: "text-info bg-info-bg",
  mute: "text-muted-foreground bg-muted",
};

export function StatusBadge({
  tone,
  children,
  dot = true,
}: {
  tone: Tone;
  children: ReactNode;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs",
        toneClass[tone],
      )}
    >
      {dot && <i className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function Panel({
  title,
  action,
  children,
  className,
}: {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("min-w-0 rounded-[10px] border border-border bg-surface", className)}>
      <div className="flex items-center justify-between gap-3 px-5 pt-4">
        <h3 className="text-[15px]">{title}</h3>
        {action}
      </div>
      <div className="px-5 pb-5 pt-3">{children}</div>
    </section>
  );
}

export function SectionLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to="/$section"
      params={{ section: to }}
      className="text-[12.5px] text-muted-foreground underline underline-offset-[3px] hover:text-foreground"
    >
      {children}
    </Link>
  );
}

export function Thumb({ color, className }: { color: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-10 flex-none rounded-lg", className)}
      style={{
        background: `linear-gradient(145deg, ${color}, color-mix(in srgb, ${color} 60%, #000))`,
      }}
    />
  );
}

export function PanelFooter({ count, label, to }: { count: number; label: string; to: string }) {
  return (
    <div className="mt-1 flex items-center justify-between border-t border-line-soft pt-3 text-[12.5px] text-muted-foreground">
      <span>
        and <b className="font-medium text-foreground">{count} more</b> {label}
      </span>
      <Link to="/$section" params={{ section: to }} className="hover:text-foreground">
        View all
      </Link>
    </div>
  );
}

/** On/off switch (prototype `.toggle`). */
export function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={cn(
        "relative h-[22px] w-[38px] flex-none rounded-full transition-colors",
        on ? "bg-primary" : "bg-[#c9c9c9]",
      )}
    >
      <i
        className={cn(
          "absolute top-[3px] size-4 rounded-full shadow-[0_1px_2px_rgba(0,0,0,.2)] transition-all",
          on ? "left-[19px] bg-primary-foreground" : "left-[3px] bg-white",
        )}
      />
    </button>
  );
}

/** Two-option pill switch (prototype `.msw`). */
export function ModeSwitch<V extends string>({
  value,
  options,
  onChange,
  title,
}: {
  value: V;
  options: { value: V; label: string }[];
  onChange: (v: V) => void;
  title?: string;
}) {
  return (
    <div
      title={title}
      className="inline-flex whitespace-nowrap rounded-full border border-border bg-surface p-0.5"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (o.value !== value) onChange(o.value);
          }}
          className={cn(
            "rounded-full px-2.5 py-1 text-[11.5px] transition-colors",
            o.value === value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** SKU / code chip (prototype `.code`). */
export function SkuChip({ children }: { children: ReactNode }) {
  return (
    <span className="whitespace-nowrap rounded border border-dashed border-[#c9c9c9] px-2 py-[3px] font-mono text-[12.5px] tracking-[.02em]">
      {children}
    </span>
  );
}

/** Small outlined label, e.g. "By appointment". `dark` for the "Manual" tag. */
export function Chip({ children, dark }: { children: ReactNode; dark?: boolean }) {
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap rounded-lg border px-2 py-0.5 text-[11.5px] tracking-[.02em]",
        dark ? "border-primary bg-primary text-[10.5px] text-primary-foreground" : "border-border",
      )}
    >
      {children}
    </span>
  );
}

/** Initials in a circle, for "who did it" cells. */
export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn("grid size-6 flex-none place-items-center rounded-full bg-hover text-[9.5px] font-semibold", className)}>
      {name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
    </span>
  );
}
