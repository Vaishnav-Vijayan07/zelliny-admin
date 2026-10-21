import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * A long list (maisons, categories…) that opens with a search box on top.
 * Typing any part of a name filters the list straight away. Short lists keep the plain select.
 */
export function SearchSelect({
  value,
  options,
  items: itemList,
  onChange,
  placeholder = "Choose",
  allLabel,
  className,
  invalid,
  id,
  searchPlaceholder = "Type to search…",
  searchable = true,
  flip,
}: {
  /** Lets the list open upwards when there is no room below (e.g. near the page bottom). */
  flip?: boolean;
  /** Set false for short lists: no search box, just the styled list. */
  searchable?: boolean;
  value: string;
  options?: string[];
  /** Full value/label pairs — used when the value is an id and the label is richer. */
  items?: { value: string; label: string }[];
  onChange: (v: string) => void;
  placeholder?: string;
  /** When set, adds a first entry with an empty value, e.g. "All maisons". */
  allLabel?: string;
  className?: string;
  invalid?: boolean;
  id?: string;
  searchPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const t = q.trim().toLowerCase();
  const src = itemList ?? (options ?? []).map((o) => ({ value: o, label: o }));
  const filtered = src.filter((o) => !t || o.label.toLowerCase().includes(t));
  const items = [
    ...(allLabel && !t ? [{ v: "", l: allLabel }] : []),
    ...filtered.map((o) => ({ v: o.value, l: o.label })),
  ];
  const currentLabel = src.find((o) => o.value === value)?.label;
  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setQ("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          className={cn(
            "flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-lg border bg-surface px-3 text-left text-[14px] outline-none hover:border-primary focus-visible:border-primary",
            open || value ? "border-border" : "border-border",
            open && "border-primary",
            invalid && "border-bad",
            className,
          )}
        >
          <span className={cn("truncate", !value && !allLabel && "text-muted-foreground")}>
            {value ? (currentLabel ?? value) : allLabel || placeholder}
          </span>
          <ChevronDown className="size-3.5 flex-none opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        avoidCollisions={!!flip}
        className="w-[var(--radix-popover-trigger-width)] min-w-[220px] rounded-xl p-1.5"
      >
        {searchable && (
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={searchPlaceholder}
            className="mb-1 h-8 w-full rounded-lg border border-border bg-hover px-2.5 text-[13px] outline-none focus:border-primary focus:bg-surface"
          />
        )}
        <div className="max-h-[260px] overflow-auto">
          {items.length ? (
            items.map((o) => (
              <button
                key={o.v || "__all"}
                type="button"
                onClick={() => {
                  onChange(o.v);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-[13.5px] hover:bg-hover",
                  o.v === value && "font-semibold",
                )}
              >
                <span className="truncate">{o.l}</span>
                {o.v === value && <Check className="size-3.5 flex-none" />}
              </button>
            ))
          ) : (
            <p className="px-2.5 py-2 text-[13px] text-muted-foreground">No match</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
