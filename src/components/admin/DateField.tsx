// Date field that shows "1 Sep 2026" and opens a panel-style calendar with Clear / Today.
import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fmt } from "@/components/admin/DiscountFlow";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fromIso = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
};
export const todayIso = () => toIso(new Date());

export function DateField({
  value,
  onChange,
  min,
  max,
  className,
}: {
  value: string;
  onChange: (iso: string) => void;
  min?: string | undefined;
  max?: string | undefined;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const pick = (iso: string) => {
    onChange(iso);
    setOpen(false);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 w-full min-w-0 items-center justify-between rounded-lg border bg-surface px-3 text-left text-[14px] outline-none",
            open ? "border-primary" : "border-border",
            className,
          )}
        >
          <span className={cn(!value && "text-muted-foreground")}>
            {value ? fmt(value) : "No date"}
          </span>
          <CalendarIcon className="size-4 flex-none" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" side="bottom" avoidCollisions={false} className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value ? fromIso(value) : undefined}
          defaultMonth={value ? fromIso(value) : new Date()}
          onSelect={(d) => d && pick(toIso(d))}
          disabled={[
            ...(min ? [{ before: fromIso(min) }] : []),
            ...(max ? [{ after: fromIso(max) }] : []),
          ]}
          classNames={{ today: "rounded-md border border-primary" }}
        />
        <div className="flex justify-between border-t border-border px-4 py-2.5 text-[13px]">
          <button
            type="button"
            className="underline underline-offset-[3px]"
            onClick={() => pick("")}
          >
            Clear
          </button>
          <button
            type="button"
            className="underline underline-offset-[3px]"
            onClick={() => {
              const t = todayIso();
              if ((min && t < min) || (max && t > max)) {
                toast("Today is outside the allowed dates");
                return;
              }
              pick(t);
            }}
          >
            Today
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
