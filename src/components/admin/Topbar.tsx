import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, Mail, Package, Search, ShoppingBag, Users, Bell, Menu } from "lucide-react";
import { clearSession } from "@/hooks/use-session";
import type { CurrentUser } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import {
  productsQuery,
  ordersQuery,
  customersQuery,
  enquiriesQuery,
  paymentsQuery,
} from "@/lib/api/sections.functions";
import { APP_PAGES } from "@/app.config";
import { formatMoney } from "@/lib/format";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface Props {
  user: CurrentUser;
  team: CurrentUser[];
  notifications: number;
  onViewAs?: (id: string) => void;
  onMenuOpen?: () => void;
}

function SearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const navigate = useNavigate();

  const products = useQuery({ ...productsQuery(), enabled: open });
  const orders = useQuery({ ...ordersQuery(), enabled: open });
  const customers = useQuery({ ...customersQuery(), enabled: open });
  const enquiries = useQuery({ ...enquiriesQuery(), enabled: open });
  const payments = useQuery({ ...paymentsQuery(), enabled: open });

  const close = () => onOpenChange(false);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search products, orders, customers, enquiries, pages…" />
      <CommandList>
        {[products, orders, customers, enquiries, payments].some((q) => q.isLoading) && (
          <CommandItem disabled>Loading…</CommandItem>
        )}
        {(products.data?.rows ?? []).length > 0 && (
          <CommandGroup heading="Products">
            {(products.data?.rows ?? []).slice(0, 8).map((p) => (
              <CommandItem
                key={p.id}
                onSelect={() => {
                  close();
                  navigate({ to: "/products/$productId", params: { productId: p.id } });
                }}
              >
                <Package />
                <span className="truncate">{p.name}</span>
                <span className="ml-auto truncate text-xs text-muted-foreground">
                  {p.sku} · {p.brand}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {(orders.data?.rows ?? []).length > 0 && (
          <CommandGroup heading="Orders">
            {(orders.data?.rows ?? []).slice(0, 8).map((o) => (
              <CommandItem
                key={o.id}
                onSelect={() => {
                  close();
                  navigate({ to: "/orders/$orderId", params: { orderId: o.id } });
                }}
              >
                <ShoppingBag />
                <b className="font-medium">{o.id}</b>
                <span className="truncate text-muted-foreground">{o.customer}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatMoney(o.total)}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {(customers.data?.rows ?? []).length > 0 && (
          <CommandGroup heading="Customers">
            {(customers.data?.rows ?? []).slice(0, 8).map((c) => (
              <CommandItem
                key={c.id}
                onSelect={() => {
                  close();
                  navigate({ to: "/customers/$customerId", params: { customerId: c.id } });
                }}
              >
                <Users />
                <span className="truncate">{c.name}</span>
                <span className="ml-auto truncate text-xs text-muted-foreground">
                  {c.email || c.phone}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {(payments.data?.rows ?? []).length > 0 && (
          <CommandGroup heading="Payments">
            {(payments.data?.rows ?? []).slice(0, 6).map((p) => (
              <CommandItem
                key={p.id}
                onSelect={() => {
                  close();
                  navigate({ to: "/payments" });
                }}
              >
                <CreditCard />
                <b className="font-medium">{p.id}</b>
                <span className="truncate text-muted-foreground">
                  {p.order} · {p.customer}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatMoney(p.amount)}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {(enquiries.data?.rows ?? []).length > 0 && (
          <CommandGroup heading="Enquiries">
            {(enquiries.data?.rows ?? []).slice(0, 8).map((e) => (
              <CommandItem
                key={e.id}
                onSelect={() => {
                  close();
                  navigate({ to: "/enquiries/$enquiryId", params: { enquiryId: e.id } });
                }}
              >
                <Mail />
                <span className="truncate">{e.company}</span>
                <span className="ml-auto truncate text-xs text-muted-foreground">{e.contact}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandGroup heading="Pages">
          {APP_PAGES.flatMap((g) =>
            g.pages.map((p) => (
              <CommandItem
                key={p.key}
                onSelect={() => {
                  close();
                  if (p.key === "dashboard") navigate({ to: "/" });
                  else navigate({ to: "/$section", params: { section: p.key } });
                }}
              >
                <span className="grid size-5 place-items-center text-[13px]">{p.icon}</span>
                {p.label}
              </CommandItem>
            )),
          )}
        </CommandGroup>
        <CommandEmpty>No matches.</CommandEmpty>
      </CommandList>
    </CommandDialog>
  );
}

export function Topbar({ user, team, notifications, onViewAs, onMenuOpen }: Props) {
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
      <button
        onClick={() => setSearchOpen(true)}
        className="flex h-9 max-w-md flex-1 items-center gap-2 rounded-lg border border-border px-3 text-left text-[13px] text-muted-foreground hover:border-foreground"
      >
        <Search className="size-3.5" />
        <span className="flex-1 truncate">Search products, orders, customers, enquiries…</span>
        <kbd className="hidden rounded border border-border px-1.5 text-[10px] sm:inline">
          Ctrl K
        </kbd>
      </button>
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <div className="ml-auto flex items-center gap-3">
        {/* <label className="hidden items-center gap-2 rounded-full border border-dashed border-border px-4 py-1.5 text-xs text-muted-foreground xl:flex">
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
        </label> */}
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
