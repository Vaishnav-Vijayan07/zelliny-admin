import type { CSSProperties, ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface DropOption {
  value: string;
  label: ReactNode;
  /** Small coloured dot in front (used for stages). */
  dot?: string;
  /** Greyed out and not selectable. */
  disabled?: boolean;
  /** Small grey text on the right. */
  hint?: string;
}

/**
 * The panel's own dropdown: a rounded white list with a soft shadow and a tick on the current
 * option — used instead of the browser's plain select.
 */
export function Dropdown({
  value,
  options,
  onChange,
  align = "start",
  className,
  style,
  menuClassName,
  label,
  ariaLabel,
  chevron = true,
  disabled,
}: {
  value: string;
  options: (DropOption | "separator")[];
  onChange: (v: string) => void;
  align?: "start" | "end";
  className?: string;
  style?: CSSProperties;
  menuClassName?: string;
  /** Replaces the selected option's label on the button. */
  label?: ReactNode;
  ariaLabel?: string;
  chevron?: boolean;
  disabled?: boolean;
}) {
  const cur = options.find((o): o is DropOption => o !== "separator" && o.value === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled ?? false}
        aria-label={ariaLabel ?? "Choose"}
        onClick={(e) => e.stopPropagation()}
        style={style}
        className={cn(
          "group inline-flex h-9 items-center justify-between gap-3 whitespace-nowrap rounded-lg border border-border bg-background px-3 text-[13px] outline-none hover:border-primary focus-visible:border-primary data-[state=open]:border-primary",
          className,
        )}
      >
        <span className="flex items-center gap-2">
          {cur?.dot && (
            <i className="size-2 rounded-full" style={{ background: cur.dot }} aria-hidden />
          )}
          {label ?? cur?.label ?? value}
        </span>
        {chevron && (
          <ChevronDown className="size-3.5 opacity-60 transition-opacity group-hover:opacity-100" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        sideOffset={6}
        className={cn(
          "min-w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl border border-border bg-surface p-1.5 shadow-[0_14px_34px_rgba(0,0,0,.12)]",
          menuClassName,
        )}
      >
        {options.map((o, i) =>
          o === "separator" ? (
            <DropdownMenuSeparator key={`sep${i}`} />
          ) : (
            <DropdownMenuItem
              key={o.value}
              disabled={!!o.disabled}
              onSelect={() => onChange(o.value)}
              className={cn(
                "cursor-pointer gap-2.5 rounded-lg px-3 py-2 text-[13.5px]",
                o.value === value && "font-medium",
              )}
            >
              {o.dot && (
                <i className="size-2 flex-none rounded-full" style={{ background: o.dot }} />
              )}
              {o.label}
              {o.hint && (
                <small className="ml-auto pl-4 text-[12px] text-muted-foreground">{o.hint}</small>
              )}
              {o.value === value && <Check className={cn("size-3.5", !o.hint && "ml-auto")} />}
            </DropdownMenuItem>
          ),
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
