import { useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import type { CurrentUser, ShellData } from "@/lib/api/types";
import { canSeePage } from "@/lib/roles";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

export function AdminShell({ shell, user, children }: { shell: ShellData; user: CurrentUser | null; children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const me = user ?? shell.user;
  const nav = shell.nav
    .map((g) => ({ ...g, items: g.items.filter((i) => canSeePage(me.role, i.key)) }))
    .filter((g) => g.items.length > 0);
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar groups={nav} />
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-[88vw] max-w-[320px] p-0 lg:hidden">
          <SheetTitle className="sr-only">Navigation menu</SheetTitle>
          <Sidebar groups={nav} mobile onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={me} team={shell.team} notifications={shell.notifications} onMenuOpen={() => setMenuOpen(true)} />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-7 md:px-8">{children}</main>
      </div>
    </div>
  );
}
