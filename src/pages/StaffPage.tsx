import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSessionUser } from "@/hooks/use-session";
import {
  ALERTS,
  SECURITY,
  SECTION_GROUPS,
  bumpTeam,
  createRole,
  decideApproval,
  findRoleByName,
  inviteMember,
  levelOf,
  setStaffLocked,
  useApprovals,
  useMembers,
  useRoles,
  useSecurity,
  type MemberStatus,
  type Role,
} from "@/lib/team-store";
import { Avatar, StatusBadge, Toggle } from "@/components/admin/primitives";
import { Button, Card, DataTable, Muted, PageHeader, type Column } from "@/components/admin/page";
import { DateField } from "@/components/admin/DateField";
import { SearchSelect } from "@/components/admin/SearchSelect";
import { useDone } from "@/components/admin/SiteContentUi";
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

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className="mb-3.5 flex min-w-0 flex-col gap-1.5">
      <label className="text-[12px] text-muted-foreground">{label}</label>
      {children}
      {error ? (
        <div className="text-[12.5px] text-bad">{error}</div>
      ) : (
        hint && <div className="text-[12px] text-muted-foreground">{hint}</div>
      )}
    </div>
  );
}

export default function StaffPage() {
  const roles = useRoles();
  const members = useMembers();
  const approvals = useApprovals();
  useSecurity();
  const owner = useIsOwner();
  const me = useSessionUser();
  const navigate = useNavigate();
  const [doneNode, done] = useDone();
  const waiting = approvals.filter((a) => a.status === "wait");
  const TABS = owner
    ? (["People", "Roles", "Waiting for approval", "Security"] as const)
    : (["People", "Roles"] as const);
  const [tab, setTab] = useState<string>("People");
  const [invite, setInvite] = useState<{
    name: string;
    email: string;
    roleId: string;
    ends: string;
  } | null>(null);
  const [newRole, setNewRole] = useState<{ name: string; from: string; error: string } | null>(
    null,
  );
  const [showDecided, setShowDecided] = useState(false);
  const [approve, setApprove] = useState<string | null>(null);
  const [reject, setReject] = useState<{ id: string; reason: string } | null>(null);
  const [lockAsk, setLockAsk] = useState(false);
  const roleOf = (id: string) => roles.find((r) => r.id === id);
  const sectionCount = (r: Role) =>
    r.id === "owner"
      ? "Everything"
      : `${SECTION_GROUPS.flatMap((g) => g.pages).filter((p) => levelOf(r, p.key) !== "none").length} sections`;
  const memberOf = (id: string) => members.find((m) => m.id === id);
  const firstRole = roles.find((r) => r.id !== "owner")?.id ?? "";

  const sendInvite = () => {
    if (!invite) return;
    const name = invite.name.trim(),
      email = invite.email.trim();
    if (!name) return void toast("Add the name");
    if (!/^\S+@zelliny\.com$/i.test(email)) return void toast("Use a @zelliny.com work email");
    if (members.some((m) => m.email.toLowerCase() === email.toLowerCase()))
      return void toast("This email is already on the team");
    inviteMember({ name, email, roleId: invite.roleId, ends: invite.ends });
    setInvite(null);
    done("Invitation sent", `An email was sent to ${email}. The link expires in 48 hours.`);
  };
  const addRole = () => {
    if (!newRole) return;
    const name = newRole.name.trim();
    if (!name) return setNewRole({ ...newRole, error: "Type a role name first" });
    if (roles.some((r) => r.name.toLowerCase() === name.toLowerCase()))
      return setNewRole({ ...newRole, error: `A role called "${name}" already exists` });
    const r = createRole(name, roleOf(newRole.from));
    setNewRole(null);
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
    {
      header: "Role",
      cell: (m) => (
        <b className="font-medium">
          {roleOf(m.roleId)?.name ?? "—"}
          {m.roleId === "owner" && (
            <span className="ml-1.5 rounded-full border border-border px-2 py-px font-sans text-[10.5px] font-normal text-muted-foreground">
              🔒 fixed
            </span>
          )}
        </b>
      ),
    },
    { header: "Last seen", cell: (m) => m.lastSeen },
    {
      header: "2-step code",
      cell: (m) => (m.status === "Invited" ? "—" : <span className="text-good">✓ On</span>),
    },
    { header: "Access ends", cell: (m) => (m.ends ? m.ends : "—") },
    {
      header: "Status",
      cell: (m) =>
        SECURITY.locked && m.roleId !== "owner" ? (
          <StatusBadge tone="mute">Locked</StatusBadge>
        ) : (
          <StatusBadge tone={TONE[m.status]}>
            {m.status === "Disabled"
              ? "Switched off"
              : m.status === "Invited"
                ? "Invited · not joined yet"
                : m.status}
          </StatusBadge>
        ),
    },
  ];

  const shown = approvals.filter((a) => (showDecided ? a.status !== "wait" : a.status === "wait"));
  const apForApprove = approvals.find((a) => a.id === approve);

  return (
    <>
      {SECURITY.locked && (
        <div className="mb-[18px] rounded-[10px] border border-[#ebc9c6] bg-bad-bg px-4 py-3 text-[13.5px] text-[#8a1f17]">
          <b className="font-medium">All staff access is locked.</b> Only you can sign in.{" "}
          <button
            type="button"
            className="ml-2 underline"
            onClick={() => {
              setStaffLocked(false);
              done("Staff access unlocked", "Your team can sign in again.");
            }}
          >
            Unlock staff access
          </button>
        </div>
      )}
      <PageHeader
        title="Team & permissions"
        subtitle="Assign each person a role, and give each role the sections it can open."
        actions={
          owner ? (
            tab === "Roles" ? (
              <Button primary onClick={() => setNewRole({ name: "", from: "", error: "" })}>
                + New role
              </Button>
            ) : tab === "People" ? (
              <Button
                primary
                onClick={() => setInvite({ name: "", email: "", roleId: firstRole, ends: "" })}
              >
                + Add member
              </Button>
            ) : undefined
          ) : undefined
        }
      />
      {!owner && (
        <div className="mb-[18px] rounded-[10px] border border-border bg-hover px-4 py-3 text-[13px]">
          🔒 <b className="font-medium">Only the owner can change the team and roles.</b> You can
          look, but not edit.
        </div>
      )}
      <div className="mb-[18px] flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[13px]",
              t === tab
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground",
            )}
          >
            {t === "People"
              ? `People · ${members.length}`
              : t === "Roles"
                ? `Roles · ${roles.length}`
                : t}
            {t === "Waiting for approval" && waiting.length > 0 && (
              <span className="ml-1.5 inline-grid h-[18px] min-w-[18px] place-items-center rounded-full bg-bad px-1.5 text-[11px] text-white">
                {waiting.length}
              </span>
            )}
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
            Click a person to change their role, end date or devices. Every person signs in with
            their own @zelliny.com email — you never handle anyone's password.
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
                onClick={() => setNewRole({ name: "", from: "", error: "" })}
                className="grid min-h-[170px] place-items-center rounded-[10px] border border-dashed border-border text-[13.5px] text-muted-foreground hover:border-primary hover:text-foreground"
              >
                + New role
              </button>
            )}
          </div>
          <p className="mt-3 text-[12px] text-muted-foreground">
            Click a role to choose what it can open and its limits. A change applies at once to
            everyone in that role.
          </p>
        </>
      )}

      {owner && tab === "Waiting for approval" && (
        <>
          <Card>
            <p className="text-[12.5px] text-muted-foreground">
              When someone goes above their role's limits, the change does not happen. It waits here
              for you. Each request is also emailed to{" "}
              <b className="font-medium text-foreground">{SECURITY.email}</b> and sent by WhatsApp,
              with Approve and Reject buttons — you confirm after signing in, so nobody else can
              approve from your email. The person who asked is told the result by email.
            </p>
          </Card>
          <div className="mb-3.5 inline-flex rounded-full border border-border p-0.5">
            {(
              [
                [false, `Waiting · ${waiting.length}`],
                [true, "Decided"],
              ] as const
            ).map(([v, l]) => (
              <button
                key={String(v)}
                type="button"
                onClick={() => setShowDecided(v)}
                className={cn(
                  "h-7 rounded-full px-3.5 text-[12.5px]",
                  showDecided === v
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground",
                )}
              >
                {l}
              </button>
            ))}
          </div>
          <Card>
            {shown.length ? (
              shown.map((a) => {
                const p = memberOf(a.who);
                return (
                  <div
                    key={a.id}
                    className="flex items-center gap-4 border-b border-line-soft px-1.5 py-4 last:border-b-0"
                  >
                    <div className="w-[110px] flex-none text-[11px] uppercase tracking-[.14em] text-muted-foreground">
                      {a.kind}
                    </div>
                    <div className="min-w-0 flex-1">
                      <b className="block text-[14px] font-medium">{a.what}</b>
                      <small className="block text-[12.5px] text-muted-foreground">{a.ref}</small>
                      <small className="block text-[12.5px] text-muted-foreground">
                        Asked by {p?.name ?? "—"} ({roleOf(p?.roleId ?? "")?.name ?? "—"}) ·{" "}
                        {a.when} · <span className="text-warn">{a.why}</span>
                      </small>
                      {a.decided && (
                        <small
                          className={cn(
                            "block text-[12.5px]",
                            a.status === "ok" ? "text-good" : "text-bad",
                          )}
                        >
                          {a.decided}
                        </small>
                      )}
                    </div>
                    {a.status === "wait" ? (
                      <div className="flex gap-2">
                        <Button onClick={() => setReject({ id: a.id, reason: "" })}>Reject</Button>
                        <Button primary onClick={() => setApprove(a.id)}>
                          Approve
                        </Button>
                      </div>
                    ) : (
                      <StatusBadge tone={a.status === "ok" ? "ok" : "mute"}>
                        {a.status === "ok" ? "Approved" : "Rejected"}
                      </StatusBadge>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="py-8 text-center text-muted-foreground">
                {showDecided ? "Nothing decided yet." : "Nothing is waiting for you."}
              </p>
            )}
          </Card>
        </>
      )}

      {owner && tab === "Security" && (
        <>
          <Card className="flex items-center justify-between gap-5 border-[#f0d6d4]">
            <div>
              <h3 className="text-[15px]">Lock all staff access</h3>
              <p className="mt-1.5 text-[12.5px] text-muted-foreground">
                In an emergency. Signs everyone except you out straight away and blocks them from
                signing in. Nothing is deleted. One click unlocks them again.
              </p>
            </div>
            {SECURITY.locked ? (
              <Button
                onClick={() => {
                  setStaffLocked(false);
                  done("Staff access unlocked", "Your team can sign in again.");
                }}
              >
                Unlock staff access
              </Button>
            ) : (
              <button
                type="button"
                className="h-9 whitespace-nowrap rounded-lg bg-bad px-4 text-[13.5px] text-white"
                onClick={() => setLockAsk(true)}
              >
                Lock all staff access
              </button>
            )}
          </Card>
          <Card>
            <h3 className="mb-3 text-[15px]">Alerts to the owner</h3>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field label="Email for approvals and alerts">
                <input
                  value={SECURITY.email}
                  onChange={(e) => {
                    SECURITY.email = e.target.value;
                    bumpTeam();
                  }}
                  className={inputCls}
                />
              </Field>
              <Field label="WhatsApp for approvals and alerts">
                <input
                  value={SECURITY.whatsapp}
                  onChange={(e) => {
                    SECURITY.whatsapp = e.target.value;
                    bumpTeam();
                  }}
                  className={inputCls}
                />
              </Field>
            </div>
            <div className="mb-3 flex gap-5 text-[13.5px]">
              {(
                [
                  ["viaEmail", "Send by email"],
                  ["viaWhatsapp", "Send by WhatsApp"],
                ] as const
              ).map(([k, l]) => (
                <label key={k} className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={SECURITY[k]}
                    onChange={(e) => {
                      SECURITY[k] = e.target.checked;
                      bumpTeam();
                    }}
                    className="accent-black"
                  />
                  {l}
                </label>
              ))}
            </div>
            <div className="mb-1 text-[12px] text-muted-foreground">Tell me when</div>
            {ALERTS.map(([k, l]) => (
              <div
                key={k}
                className="flex items-center justify-between gap-4 border-t border-line-soft py-2.5 text-[13.5px]"
              >
                {l}
                <Toggle
                  on={!!SECURITY.alerts[k]}
                  label={l}
                  onChange={() => {
                    SECURITY.alerts[k] = !SECURITY.alerts[k];
                    bumpTeam();
                  }}
                />
              </div>
            ))}
            <p className="mt-2.5 text-[12px] text-muted-foreground">
              Requests above a role's limits are always sent to you — they can't be switched off.
            </p>
          </Card>
          <Card>
            <h3 className="mb-3 text-[15px]">Sign-in protection</h3>
            <div className="flex items-center justify-between gap-4 border-t border-line-soft py-3 first:border-0">
              <div>
                <div className="text-[13.5px]">2-step code for everyone</div>
                <div className="text-[12px] text-muted-foreground">
                  Always on. Each person confirms sign-in with a code on their phone.
                </div>
              </div>
              <span className="opacity-40">
                <Toggle
                  on
                  label="2-step code"
                  onChange={() => toast("The 2-step code is always required")}
                />
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-line-soft py-3">
              <div className="text-[13.5px]">Sign out automatically after no activity</div>
              <SearchSelect
                value={SECURITY.idleMinutes}
                items={["15", "30", "60"].map((v) => ({ value: v, label: `${v} minutes` }))}
                onChange={(v) => {
                  if (v) {
                    SECURITY.idleMinutes = v;
                    bumpTeam();
                  }
                }}
                searchable={false}
                className="w-[150px]"
              />
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-line-soft py-3">
              <div>
                <div className="text-[13.5px]">Block an account after failed sign-in attempts</div>
                <div className="text-[12px] text-muted-foreground">
                  You get an alert, and unblock it from the person's page
                </div>
              </div>
              <SearchSelect
                value={SECURITY.failedAttempts}
                items={["3", "5", "10"].map((v) => ({ value: v, label: `${v} attempts` }))}
                onChange={(v) => {
                  if (v) {
                    SECURITY.failedAttempts = v;
                    bumpTeam();
                  }
                }}
                searchable={false}
                className="w-[150px]"
              />
            </div>
          </Card>
          <Card>
            <h3 className="mb-1 text-[15px]">Your own access — backup</h3>
            <p className="mb-3 text-[12.5px] text-muted-foreground">
              If you lose your phone or can't get your 2-step code, the panel sends a recovery link
              here. There is one Owner, and it can never be removed.
            </p>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field label="Backup email">
                <input
                  value={SECURITY.backupEmail}
                  onChange={(e) => {
                    SECURITY.backupEmail = e.target.value;
                    bumpTeam();
                  }}
                  className={inputCls}
                />
              </Field>
              <Field label="Backup phone">
                <input
                  value={SECURITY.backupPhone}
                  onChange={(e) => {
                    SECURITY.backupPhone = e.target.value;
                    bumpTeam();
                  }}
                  className={inputCls}
                />
              </Field>
            </div>
          </Card>
          <Card>
            <h3 className="mb-2 text-[15px]">Only the owner can</h3>
            <ul className="mb-2 list-disc space-y-1 pl-5 text-[13.5px]">
              <li>
                Delete anything — products, customers, orders, promotions, pages. Staff can switch
                off or archive, never delete.
              </li>
              <li>Change payment, bank and payout settings</li>
              <li>Add, switch off or remove team members, and change roles</li>
              <li>Open the Activity log, Team & permissions, Tracking & scripts and Settings</li>
              <li>Approve requests above the limits</li>
            </ul>
            <p className="text-[12.5px] text-muted-foreground">
              The Activity log can't be edited or deleted by anyone, including the owner.
            </p>
          </Card>
          <Button primary onClick={() => done("Security saved", "Your changes are live.")}>
            Save security settings
          </Button>
        </>
      )}

      <Dialog open={!!invite} onOpenChange={(o) => !o && setInvite(null)}>
        <DialogContent className="max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="font-head text-[18px] font-normal">Add member</DialogTitle>
          </DialogHeader>
          {invite && (
            <>
              <p className="text-[13.5px]">
                They get an email invitation to set their own password and 2-step code. You never
                see or handle their password.
              </p>
              <div className="grid gap-3.5 sm:grid-cols-2">
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
                <Field label="Role">
                  <SearchSelect
                    value={invite.roleId}
                    items={roles
                      .filter((r) => r.id !== "owner")
                      .map((r) => ({ value: r.id, label: r.name }))}
                    onChange={(v) => v && setInvite({ ...invite, roleId: v })}
                    searchable={false}
                    className="text-[14px]"
                  />
                </Field>
                <Field label="Access ends (optional)">
                  <DateField
                    value={invite.ends}
                    onChange={(v) => setInvite({ ...invite, ends: v })}
                  />
                </Field>
              </div>
            </>
          )}
          <DialogFooter>
            <Button onClick={() => setInvite(null)}>Cancel</Button>
            <Button primary onClick={sendInvite}>
              Send invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!newRole} onOpenChange={(o) => !o && setNewRole(null)}>
        <DialogContent className="max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="font-head text-[18px] font-normal">New role</DialogTitle>
          </DialogHeader>
          {newRole && (
            <>
              <Field label="Role name" error={newRole.error}>
                <input
                  autoFocus
                  value={newRole.name}
                  onChange={(e) => setNewRole({ ...newRole, name: e.target.value, error: "" })}
                  onKeyDown={(e) => e.key === "Enter" && addRole()}
                  className={cn(inputCls, newRole.error && "border-bad bg-[#fff8f7]")}
                  placeholder="e.g. Customer service"
                />
              </Field>
              <Field
                label="Start from"
                hint="Copying gives the new role the same sections, limits and actions. You can change them on the next page."
              >
                <SearchSelect
                  value={newRole.from}
                  allLabel="Empty — every section set to No access"
                  items={roles
                    .filter((r) => r.id !== "owner")
                    .map((r) => ({ value: r.id, label: `Copy of ${r.name}` }))}
                  onChange={(v) => setNewRole({ ...newRole, from: v })}
                  searchable={false}
                  className="text-[14px]"
                />
              </Field>
            </>
          )}
          <DialogFooter>
            <Button onClick={() => setNewRole(null)}>Cancel</Button>
            <Button primary onClick={addRole}>
              Create role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!approve} onOpenChange={(o) => !o && setApprove(null)}>
        <DialogContent className="max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="font-head text-[18px] font-normal">
              Approve this {apForApprove?.kind.toLowerCase()}?
            </DialogTitle>
          </DialogHeader>
          <p className="text-[13.5px]">
            <b className="font-medium">{apForApprove?.what}</b>
            <br />
            {apForApprove?.ref}
          </p>
          <p className="text-[13px] text-muted-foreground">
            It happens straight away, and {memberOf(apForApprove?.who ?? "")?.name} is told by
            email.
          </p>
          <DialogFooter>
            <Button onClick={() => setApprove(null)}>Cancel</Button>
            <Button
              primary
              onClick={() => {
                if (!apForApprove) return;
                decideApproval(apForApprove.id, true, me?.name ?? "Owner");
                setApprove(null);
                done(
                  "Approved",
                  `${apForApprove.kind} approved. ${memberOf(apForApprove.who)?.name ?? "The person"} has been told.`,
                );
              }}
            >
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reject} onOpenChange={(o) => !o && setReject(null)}>
        <DialogContent className="max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="font-head text-[18px] font-normal">
              Reject this request?
            </DialogTitle>
          </DialogHeader>
          {reject && (
            <Field
              label={`Reason (sent to ${memberOf(approvals.find((a) => a.id === reject.id)?.who ?? "")?.name ?? "the person"})`}
            >
              <textarea
                autoFocus
                value={reject.reason}
                onChange={(e) => setReject({ ...reject, reason: e.target.value })}
                placeholder="e.g. Please offer store credit instead"
                rows={3}
                className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2.5 text-[14px] outline-none focus:border-primary"
              />
            </Field>
          )}
          <DialogFooter>
            <Button onClick={() => setReject(null)}>Cancel</Button>
            <button
              type="button"
              className="h-9 rounded-lg bg-bad px-4 text-[13.5px] text-white"
              onClick={() => {
                if (!reject) return;
                if (!reject.reason.trim()) return void toast("Add a reason");
                const a = approvals.find((x) => x.id === reject.id);
                decideApproval(reject.id, false, me?.name ?? "Owner", reject.reason.trim());
                setReject(null);
                done(
                  "Rejected",
                  `Nothing has changed. ${memberOf(a?.who ?? "")?.name ?? "The person"} has been told why.`,
                );
              }}
            >
              Reject
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={lockAsk} onOpenChange={setLockAsk}>
        <DialogContent className="max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="font-head text-[18px] font-normal">
              Lock all staff access?
            </DialogTitle>
          </DialogHeader>
          <p className="text-[13.5px]">
            {members.filter((m) => m.roleId !== "owner" && m.status === "Active").length} people
            will be signed out everywhere straight away and can't sign in until you unlock. Orders
            on the website keep working.
          </p>
          <DialogFooter>
            <Button onClick={() => setLockAsk(false)}>Cancel</Button>
            <button
              type="button"
              className="h-9 rounded-lg bg-bad px-4 text-[13.5px] text-white"
              onClick={() => {
                setStaffLocked(true);
                setLockAsk(false);
                done(
                  "Staff access locked",
                  "Everyone except you is signed out. Unlock from the bar at the top.",
                );
              }}
            >
              Lock now
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {doneNode}
    </>
  );
}
