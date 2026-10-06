import { useNavigate } from "@tanstack/react-router";
import { Bell, Menu, Search } from "lucide-react";
import { clearSession } from "@/hooks/use-session";
import type { CurrentUser } from "@/lib/api/types";
import { Button } from "@/components/ui/button";

interface Props {
  user: CurrentUser;
  team: CurrentUser[];
  notifications: number;
  onViewAs?: (id: string) => void;
  onMenuOpen?: () => void;
}

export function Topbar({ user, team, notifications, onViewAs, onMenuOpen }: Props) {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-border bg-surface/95 px-4 backdrop-blur md:px-8">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Open navigation menu"
        onClick={onMenuOpen}
        className="shrink-0 lg:hidden"
      >
        <Menu />
      </Button>
      <button className="flex h-9 max-w-md flex-1 items-center gap-2 rounded-lg border border-border px-3 text-left text-[13px] text-muted-foreground hover:border-foreground">
        <Search className="size-3.5" />
        <span className="flex-1 truncate">Search products, orders, customers, enquiries…</span>
        <kbd className="hidden rounded border border-border px-1.5 text-[10px] sm:inline">
          Ctrl K
        </kbd>
      </button>
      <div className="ml-auto flex items-center gap-3">
        <label className="hidden items-center gap-2 rounded-full border border-dashed border-border px-4 py-1.5 text-xs text-muted-foreground xl:flex">
          View as
          <select
            defaultValue={user.id}
            onChange={(e) => onViewAs?.(e.target.value)}
            className="bg-transparent text-foreground outline-none"
          >
            {team.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {t.role}
              </option>
            ))}
          </select>
        </label>
        <button
          aria-label="Notifications"
          className="relative grid size-9 place-items-center rounded-full border border-border hover:border-foreground"
        >
          <Bell className="size-4" />
          {notifications > 0 && (
            <i className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-bad text-[10px] not-italic text-primary-foreground">
              {notifications}
            </i>
          )}
        </button>
        <div className="hidden items-center gap-2.5 md:flex">
          <span className="grid size-9 place-items-center rounded-full bg-muted text-xs font-semibold">
            {user.initials}
          </span>
          <div className="leading-tight">
            <b className="block text-[13px] font-medium">{user.name}</b>
            <span className="text-[11px] text-muted-foreground">
              {user.role} · {user.username}
            </span>
          </div>
        </div>
        <button
          onClick={() => {
            clearSession();
            navigate({ to: "/login" });
          }}
          className="rounded-full border border-border px-3 py-1.5 text-xs hover:border-foreground"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
