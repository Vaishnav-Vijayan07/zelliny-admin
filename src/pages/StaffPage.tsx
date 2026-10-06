import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSessionUser } from "@/hooks/use-session";
import {
  MIN_PASSWORD,
  createRole,
  findRoleByName,
  inviteMember,
  levelOf,
  useMembers,
  useRoles,
  type MemberStatus,
  type Role,
} from "@/lib/team-store";
import { SECTION_GROUPS } from "@/lib/team-store";
import { Avatar, StatusBadge } from "@/components/admin/primitives";
import { Button, Card, DataTable, Muted, PageHeader, type Column } from "@/components/admin/page";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const inputCls =
  "h-9 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-[14px] outline-none focus:border-primary";
const TONE: Record<MemberStatus, "ok" | "info" | "bad"> = {
  Active: "ok",
  Invited: "info",
  Disabled: "bad",
};
export const useIsOwner = () => findRoleByName(useSessionUser()?.role)?.id === "owner";

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="mb-3.5 flex min-w-0 flex-col gap-1.5">
      <label className="text-[12px] text-muted-foreground">{label}</label>
      {children}
      {hint && <div className="text-[12px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

const TABS = ["People", "Roles"] as const;

export default function StaffPage() {
  const roles = useRoles();
  const members = useMembers();
  const owner = useIsOwner();
  const navigate = useNavigate();
  const [tab, setTab] = useState<(typeof TABS)[number]>("People");
  const [invite, setInvite] = useState<{
    name: string;
    email: string;
    password: string;
    confirm: string;
    roleId: string;
  } | null>(null);
  const [newRole, setNewRole] = useState<string | null>(null);
  const roleOf = (id: string) => roles.find((r) => r.id === id);
  const sectionCount = (r: Role) =>
    r.id === "owner"
      ? "Everything"
      : `${SECTION_GROUPS.flatMap((g) => g.pages).filter((p) => levelOf(r, p.key) !== "none").length} sections`;

  const sendInvite = () => {
    if (!invite) return;
    const name = invite.name.trim(),
      email = invite.email.trim();
    if (!name || !/^\S+@\S+\.\S+$/.test(email)) {
      toast("Add the name and a valid work email");
      return;
    }
    if (members.some((m) => m.email.toLowerCase() === email.toLowerCase())) {
      toast("This email is already on the team");
      return;
    }
    if (invite.password.length < MIN_PASSWORD) {
      toast(`The password needs at least ${MIN_PASSWORD} characters`);
      return;
    }
    if (invite.password !== invite.confirm) {
      toast("The two passwords don't match");
      return;
    }
    const m = inviteMember({ name, email, password: invite.password, roleId: invite.roleId });
    toast(`${name} added as ${roleOf(invite.roleId)?.name}`);
    setInvite(null);
    navigate({ to: "/staff/member/$memberId", params: { memberId: m.id } });
  };
  const addRole = () => {
    const name = (newRole ?? "").trim();
    if (!name) {
      toast("Name the role first");
      return;
    }
    if (roles.some((r) => r.name.toLowerCase() === name.toLowerCase())) {
      toast(`A role called "${name}" already exists`);
      return;
    }
    const r = createRole(name);
    setNewRole(null);
    toast("Role created — now tick what it can open");
    navigate({ to: "/staff/role/$roleId", params: { roleId: r.id } });
  };

  const columns: Column<(typeof members)[number]>[] = [
    {
      header: "Member",
      cell: (m) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={m.name} className="size-[30px] text-[11px]" />
          <div>
            <b className="font-medium">{m.name}</b>
            <Muted>{m.email}</Muted>
          </div>
        </div>
      ),
    },
    {
      header: "Username",
      cell: (m) => (
        <span className="rounded border border-dashed border-border px-2 py-0.5 font-mono text-[12px]">
          {m.username}
        </span>
      ),
    },
    { header: "Role", cell: (m) => <b className="font-medium">{roleOf(m.roleId)?.name ?? "—"}</b> },
    { header: "Last seen", cell: (m) => m.lastSeen },
    {
      header: "Status",
      cell: (m) => (
        <StatusBadge tone={TONE[m.status]}>
          {m.status === "Disabled" ? "Switched off" : m.status}
        </StatusBadge>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Team & permissions"
        subtitle="Assign each person a role, and give each role the sections it can open."
        actions={
          owner ? (
            tab === "Roles" ? (
              <Button primary onClick={() => setNewRole("")}>
                + New role
              </Button>
            ) : (
              <Button
                primary
                onClick={() =>
                  setInvite({
                    name: "",
                    email: "",
                    password: "",
                    confirm: "",
                    roleId: roles.find((r) => r.id !== "owner")?.id ?? "",
                  })
                }
              >
                + Add member
              </Button>
            )
          ) : undefined
        }
      />
      {!owner && (
        <div className="mb-[18px] rounded-[10px] border border-border bg-hover px-4 py-3 text-[13px]">
          🔒 <b className="font-medium">Only the owner can change the team and roles.</b> You can
          look, but not edit.
        </div>
      )}
      <div className="mb-[18px] flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "-mb-px border-b-2 px-3.5 py-2.5 text-[13px]",
              t === tab
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "People" && (
        <Card>
          <DataTable
            columns={columns}
            rows={members}
            rowKey={(m) => m.id}
            onRowClick={(m) =>
              navigate({ to: "/staff/member/$memberId", params: { memberId: m.id } })
            }
          />
          <p className="mt-3 text-[12px] text-muted-foreground">
            Click a person to change their role, edit their details or switch their access off.
          </p>
        </Card>
      )}

      {tab === "Roles" && (
        <>
          <div className="grid gap-[18px] lg:grid-cols-3">
            {roles.map((r) => {
              const mem = members.filter((m) => m.roleId === r.id);
              return (
                <Link
                  key={r.id}
                  to="/staff/role/$roleId"
                  params={{ roleId: r.id }}
                  className="flex min-h-[170px] flex-col gap-2.5 rounded-[10px] border border-border bg-surface px-5 py-[18px] transition hover:border-primary"
                >
                  <h4 className="flex items-center gap-2 font-head text-[18px] font-normal">
                    {r.name}
                    {r.locked && (
                      <span className="rounded-full border border-border px-2 py-px font-sans text-[10.5px] text-muted-foreground">
                        🔒 fixed
                      </span>
                    )}
                  </h4>
                  <p className="flex-1 text-[12.5px] leading-relaxed text-muted-foreground">
                    {r.description || "No description yet."}
                  </p>
                  <div className="flex items-center justify-between border-t border-line-soft pt-2.5 text-[12px] text-muted-foreground">
                    <span>
                      {sectionCount(r)} · {mem.length} {mem.length === 1 ? "person" : "people"}
                    </span>
                    <span className="flex">
                      {mem.slice(0, 4).map((m) => (
                        <Avatar
                          key={m.id}
                          name={m.name}
                          className="-ml-1.5 border-2 border-surface first:ml-0"
                        />
                      ))}
                    </span>
                  </div>
                </Link>
              );
            })}
            {owner && (
              <button
                type="button"
                onClick={() => setNewRole("")}
                className="grid min-h-[170px] place-items-center rounded-[10px] border border-dashed border-border text-[13.5px] text-muted-foreground hover:border-primary hover:text-foreground"
              >
                + New role
              </button>
            )}
          </div>
          <p className="mt-3 text-[12px] text-muted-foreground">
            Click a role to choose what it can open. A change applies at once to everyone in that
            role.
          </p>
        </>
      )}

      <Dialog open={!!invite} onOpenChange={(o) => !o && setInvite(null)}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-head text-[18px] font-normal">Add team member</DialogTitle>
          </DialogHeader>
          {invite && (
            <>
              <Field label="Name">
                <input
                  autoFocus
                  value={invite.name}
                  onChange={(e) => setInvite({ ...invite, name: e.target.value })}
                  className={inputCls}
                  placeholder="e.g. Mona Samir"
                />
              </Field>
              <Field label="Work email">
                <input
                  value={invite.email}
                  onChange={(e) => setInvite({ ...invite, email: e.target.value })}
                  className={inputCls}
                  placeholder="name@zelliny.com"
                />
              </Field>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field label="Password" hint={`At least ${MIN_PASSWORD} characters`}>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={invite.password}
                    onChange={(e) => setInvite({ ...invite, password: e.target.value })}
                    className={inputCls}
                  />
                </Field>
                <Field label="Confirm password">
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={invite.confirm}
                    onChange={(e) => setInvite({ ...invite, confirm: e.target.value })}
                    className={inputCls}
                  />
                </Field>
              </div>
              <Field label="Role" hint="The role decides what they can open.">
                <select
                  value={invite.roleId}
                  onChange={(e) => setInvite({ ...invite, roleId: e.target.value })}
                  className={cn(inputCls, "cursor-pointer")}
                >
                  {roles
                    .filter((r) => r.id !== "owner")
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                </select>
              </Field>
            </>
          )}
          <DialogFooter>
            <Button onClick={() => setInvite(null)}>Cancel</Button>
            <Button primary onClick={sendInvite}>
              Add member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newRole !== null} onOpenChange={(o) => !o && setNewRole(null)}>
        <DialogContent className="max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="font-head text-[18px] font-normal">New role</DialogTitle>
          </DialogHeader>
          <Field label="Role name">
            <input
              autoFocus
              value={newRole ?? ""}
              onChange={(e) => setNewRole(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addRole()}
              className={inputCls}
              placeholder="e.g. Customer service"
            />
          </Field>
          <DialogFooter>
            <Button onClick={() => setNewRole(null)}>Cancel</Button>
            <Button primary onClick={addRole}>
              Create role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
