import { Link } from "@tanstack/react-router";
import type { NavGroup, NavItem } from "@/lib/api/types";

function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: (() => void) | undefined }) {
  const cls = "flex items-center gap-3 rounded-lg px-4 py-2 text-[13.5px] transition-colors hover:bg-hover";
  const active = { className: "bg-primary text-primary-foreground hover:bg-primary" };
  const inner = (
    <>
      <span className="w-4 text-center text-xs opacity-70">{item.icon}</span>
      <span className="flex-1">{item.label}</span>
      {item.badge != null && (
        <em className="rounded-full bg-muted px-2 text-[11px] not-italic text-muted-foreground">{item.badge}</em>
      )}
    </>
  );
  if (item.key === "dashboard") {
    return <Link to="/" className={cls} activeProps={active} activeOptions={{ exact: true }} onClick={onNavigate}>{inner}</Link>;
  }
  return <Link to="/$section" params={{ section: item.key }} className={cls} activeProps={active} onClick={onNavigate}>{inner}</Link>;
}

export function Sidebar({ groups, mobile = false, onNavigate }: { groups: NavGroup[]; mobile?: boolean; onNavigate?: (() => void) | undefined }) {
  return (
    <aside className={mobile ? "flex h-full w-full flex-col bg-surface" : "sticky top-0 hidden h-screen w-[248px] flex-none flex-col border-r border-border bg-surface lg:flex"}>
      <div className="flex items-baseline gap-3 px-6 pb-6 pt-6">
        <span className="font-head text-lg tracking-[.35em]">ZELLINY</span>
        <span className="text-[10px] tracking-[.2em] text-muted-foreground">ADMIN</span>
      </div>
      <nav className="flex-1 overflow-y-auto px-2.5 pb-6">
        {groups.map((g) => (
          <div key={g.title} className="mb-4">
            <div className="px-3.5 pb-2 text-[10.5px] uppercase tracking-[.18em] text-muted-foreground">{g.title}</div>
            <div className="space-y-0.5">
              {g.items.map((i) => <NavLink key={i.key} item={i} onNavigate={onNavigate} />)}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-border px-6 py-4 text-[12.5px] text-muted-foreground">
        <a href="https://zelliny.com" target="_blank" rel="noreferrer" className="hover:text-foreground">↗ View zelliny.com</a>
      </div>
    </aside>
  );
}
