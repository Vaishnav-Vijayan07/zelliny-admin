import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  MIN_PASSWORD,
  SECTION_GROUPS,
  levelOf,
  removeMember,
  updateMember,
  useMembers,
  useRoles,
} from "@/lib/team-store";
import { StatusBadge } from "@/components/admin/primitives";
import { Button } from "@/components/admin/page";
import { useIsOwner } from "@/pages/StaffPage";

const inputCls =
  "h-9 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-[14px] outline-none focus:border-primary";
const LV = {
  edit: ["Can edit", "bg-good-bg text-good"],
  view: ["View only", "bg-info-bg text-info"],
  none: ["No access", "bg-muted text-muted-foreground"],
} as const;

export default function StaffMemberPage({ memberId }: { memberId: string }) {
  const members = useMembers();
  const roles = useRoles();
  const owner = useIsOwner();
  const navigate = useNavigate();
  const m = members.find((x) => x.id === memberId);
  const [name, setName] = useState(m?.name ?? "");
  const [email, setEmail] = useState(m?.email ?? "");
  const [roleId, setRoleId] = useState(m?.roleId ?? "");
  const [username, setUsername] = useState(m?.username ?? "");
  const [pw, setPw] = useState({ next: "", confirm: "" });
  useEffect(() => {
    setName(m?.name ?? "");
    setEmail(m?.email ?? "");
    setRoleId(m?.roleId ?? "");
    setUsername(m?.username ?? "");
  }, [m?.id, m?.roleId]);

  if (!m)
    return <p className="py-24 text-center text-muted-foreground">This person was not found.</p>;
  const role = roles.find((r) => r.id === m.roleId)!;
  const isOwnerRole = m.roleId === "owner";
  const edit = owner && !isOwnerRole;
  const dirty =
    name.trim() !== m.name ||
    email.trim() !== m.email ||
    roleId !== m.roleId ||
    username.trim() !== m.username;

  const save = () => {
    if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      toast("Add a name and a valid email");
      return;
    }
    if (
      members.some((x) => x.id !== m.id && x.email.toLowerCase() === email.trim().toLowerCase())
    ) {
      toast("This email is already on the team");
      return;
    }
    if (!username.trim()) {
      toast("The username can't be empty");
      return;
    }
    if (
      members.some(
        (x) => x.id !== m.id && x.username.toLowerCase() === username.trim().toLowerCase(),
      )
    ) {
      toast("This username is taken");
      return;
    }
    updateMember(m.id, {
      name: name.trim(),
      email: email.trim(),
      username: username.trim(),
      roleId,
    });
    toast(
      roleId !== m.roleId
        ? `${name.trim()} is now ${roles.find((r) => r.id === roleId)?.name}`
        : "Saved",
    );
  };
  const resetPassword = () => {
    if (pw.next.length < MIN_PASSWORD) {
      toast(`The password needs at least ${MIN_PASSWORD} characters`);
      return;
    }
    if (pw.next !== pw.confirm) {
      toast("The two passwords don't match");
      return;
    }
    updateMember(m.id, { password: pw.next });
    setPw({ next: "", confirm: "" });
    toast(`New password set for ${m.name} — they are signed out everywhere`);
  };
  const toggleAccess = () => {
    const to = m.status === "Disabled" ? "Active" : "Disabled";
    updateMember(m.id, { status: to });
    toast(
      to === "Disabled"
        ? `${m.name} is switched off and signed out everywhere`
        : `${m.name} can sign in again`,
    );
  };
  const remove = () => {
    removeMember(m.id);
    toast(`${m.name} removed from the team`);
    navigate({ to: "/staff" });
  };

  return (
    <>
      <div className="mb-[22px]">
        <div className="mb-2 text-[12px] text-muted-foreground">
          <Link to="/staff" className="underline underline-offset-[3px]">
            Team & permissions
          </Link>{" "}
          / {m.name}
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] leading-tight">{m.name}</h1>
            <p className="mt-1 text-muted-foreground">
              {role.name} · {m.email} ·{" "}
              <span className="font-mono text-[12.5px]">{m.username}</span>
            </p>
          </div>
          <StatusBadge
            tone={m.status === "Active" ? "ok" : m.status === "Invited" ? "info" : "bad"}
          >
            {m.status === "Disabled" ? "Switched off" : m.status}
          </StatusBadge>
        </div>
      </div>
      {m.status === "Disabled" && (
        <div className="mb-[18px] rounded-[10px] border border-bad-bg bg-bad-bg px-4 py-3 text-[13px]">
          ⛔ <b className="font-medium">Access switched off.</b> {m.name} can't sign in. Everything
          they did stays in the Activity log.
        </div>
      )}
      <div className="grid items-start gap-[18px] min-[981px]:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <section className="mb-[18px] rounded-[10px] border border-border bg-surface px-5 pb-5 pt-4">
            <h3 className="mb-3 text-[15px]">Details & role</h3>
            {isOwnerRole && (
              <p className="mb-3 text-[13px] text-muted-foreground">
                Owner — full access. This can't be changed.
              </p>
            )}
            <div className="grid gap-3.5 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-[12px] text-muted-foreground">
                Name
                <input
                  disabled={!edit}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={cn(inputCls, "disabled:opacity-60")}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-[12px] text-muted-foreground">
                Work email
                <input
                  disabled={!edit}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn(inputCls, "disabled:opacity-60")}
                />
              </label>
            </div>
            <label className="mt-3.5 flex flex-col gap-1.5 text-[12px] text-muted-foreground">
              Username
              <input
                disabled={!edit}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={cn(inputCls, "font-mono disabled:opacity-60")}
              />
            </label>
            <label className="mt-3.5 flex flex-col gap-1.5 text-[12px] text-muted-foreground">
              Role
              <select
                disabled={!edit}
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                className={cn(inputCls, "cursor-pointer disabled:opacity-60")}
              >
                {roles
                  .filter((r) => r.id !== "owner" || isOwnerRole)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
              </select>
              <span>Changing the role changes what they can open straight away.</span>
            </label>
            {edit && (
              <div className="mt-4 flex gap-2">
                <Button primary onClick={save}>
                  {dirty ? "Save changes" : "Saved"}
                </Button>
                <Link to="/staff/role/$roleId" params={{ roleId: role.id }}>
                  <Button>Open this role</Button>
                </Link>
              </div>
            )}
          </section>
          <section className="mb-[18px] rounded-[10px] border border-border bg-surface px-5 pb-5 pt-4">
            <h3 className="mb-1 text-[15px]">What {m.name.split(" ")[0]} can open</h3>
            {SECTION_GROUPS.map((g) => (
              <div key={g.title}>
                <h5 className="mb-1 mt-4 text-[10.5px] font-normal uppercase tracking-[.14em] text-muted-foreground">
                  {g.title}
                </h5>
                {g.pages.map((p) => {
                  const [l, c] = LV[levelOf(role, p.key)];
                  return (
                    <div
                      key={p.key}
                      className="flex items-center gap-3.5 border-b border-line-soft py-2 text-[13.5px] last:border-b-0"
                    >
                      <span className="w-[22px] text-center text-muted-foreground">{p.icon}</span>
                      <span className="flex-1">{p.label}</span>
                      <span className={cn("rounded-full px-2.5 py-0.5 text-[12px]", c)}>{l}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </section>
        </div>
        <div className="min-w-0">
          <section className="mb-[18px] rounded-[10px] border border-border bg-surface px-5 pb-5 pt-4">
            <h3 className="mb-3 text-[15px]">Sign-in</h3>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-[13px]">
              <dt className="text-muted-foreground">Username</dt>
              <dd className="text-right font-mono text-[12px]">{m.username}</dd>
              <dt className="text-muted-foreground">Last seen</dt>
              <dd className="text-right">{m.lastSeen}</dd>
              <dt className="text-muted-foreground">2-step code</dt>
              <dd className="text-right text-good">✓ On · required</dd>
            </dl>
          </section>
          {edit && (
            <section className="mb-[18px] rounded-[10px] border border-border bg-surface px-5 pb-5 pt-4">
              <h3 className="mb-3 text-[15px]">Reset password</h3>
              <label className="mb-3 flex flex-col gap-1.5 text-[12px] text-muted-foreground">
                New password
                <input
                  type="password"
                  autoComplete="new-password"
                  value={pw.next}
                  onChange={(e) => setPw({ ...pw, next: e.target.value })}
                  className={inputCls}
                />
                <span>At least {MIN_PASSWORD} characters</span>
              </label>
              <label className="mb-3 flex flex-col gap-1.5 text-[12px] text-muted-foreground">
                Confirm password
                <input
                  type="password"
                  autoComplete="new-password"
                  value={pw.confirm}
                  onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                  className={inputCls}
                />
              </label>
              <Button onClick={resetPassword}>Set new password</Button>
            </section>
          )}
          {edit && (
            <section className="rounded-[10px] border border-bad-bg bg-surface px-5 pb-5 pt-4">
              <h3 className="mb-3 text-[15px] text-bad">Leaving the team</h3>
              <p className="mb-3 text-[13px]">
                Switching access off signs {m.name.split(" ")[0]} out everywhere, immediately. Their
                history stays. Removing them deletes the account.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={toggleAccess}>
                  {m.status === "Disabled" ? "Switch access back on" : "Switch off access now"}
                </Button>
                <Button onClick={remove}>Remove from team</Button>
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
