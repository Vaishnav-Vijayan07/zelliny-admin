import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  SECTION_GROUPS,
  SECURITY,
  levelOf,
  removeMember,
  updateMember,
  useMembers,
  useRoles,
} from "@/lib/team-store";
import { toast } from "sonner";
import { StatusBadge } from "@/components/admin/primitives";
import { Button } from "@/components/admin/page";
import { DateField } from "@/components/admin/DateField";
import { SearchSelect } from "@/components/admin/SearchSelect";
import { StickyCol } from "@/components/admin/StickyCol";
import { useDone } from "@/components/admin/SiteContentUi";
import { useIsOwner } from "@/pages/StaffPage";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const inputCls =
  "h-9 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-[14px] outline-none focus:border-primary";
const LV = {
  edit: ["Can edit", "bg-good-bg text-good"],
  view: ["View only", "bg-info-bg text-info"],
  none: ["No access", "bg-muted text-muted-foreground"],
} as const;
const box = "mb-[18px] rounded-[10px] border border-border bg-surface px-5 pb-5 pt-4";
const redBtn = "h-9 rounded-lg bg-bad px-4 text-[13.5px] text-white";

export default function StaffMemberPage({ memberId }: { memberId: string }) {
  const members = useMembers();
  const roles = useRoles();
  const owner = useIsOwner();
  const navigate = useNavigate();
  const [doneNode, done] = useDone();
  const m = members.find((x) => x.id === memberId);
  const [name, setName] = useState(m?.name ?? "");
  const [email, setEmail] = useState(m?.email ?? "");
  const [roleId, setRoleId] = useState(m?.roleId ?? "");
  const [username, setUsername] = useState(m?.username ?? "");
  const [ends, setEnds] = useState(m?.ends ?? "");
  const [ask, setAsk] = useState<null | "off" | "remove">(null);
  useEffect(() => {
    setName(m?.name ?? "");
    setEmail(m?.email ?? "");
    setRoleId(m?.roleId ?? "");
    setUsername(m?.username ?? "");
    setEnds(m?.ends ?? "");
  }, [m?.id, m?.roleId]);

  if (!m)
    return <p className="py-24 text-center text-muted-foreground">This person was not found.</p>;
  const role = roles.find((r) => r.id === m.roleId)!;
  const isOwnerRole = m.roleId === "owner";
  const edit = owner && !isOwnerRole;
  const first = m.name.split(" ")[0];
  const dirty =
    name.trim() !== m.name ||
    email.trim() !== m.email ||
    roleId !== m.roleId ||
    username.trim() !== m.username ||
    ends !== m.ends;

  const save = () => {
    if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email.trim()))
      return void toast("Add a name and a valid email");
    if (members.some((x) => x.id !== m.id && x.email.toLowerCase() === email.trim().toLowerCase()))
      return void toast("This email is already on the team");
    if (!username.trim()) return void toast("The username can't be empty");
    if (
      members.some(
        (x) => x.id !== m.id && x.username.toLowerCase() === username.trim().toLowerCase(),
      )
    )
      return void toast("This username is taken");
    updateMember(m.id, {
      name: name.trim(),
      email: email.trim(),
      username: username.trim(),
      roleId,
      ends,
    });
    done(
      "Saved",
      roleId !== m.roleId
        ? `${name.trim()} is now ${roles.find((r) => r.id === roleId)?.name} — the change applies straight away.`
        : "Your changes are saved.",
    );
  };
  const resetLink = () =>
    done(
      "Reset link sent",
      `A link to set a new password was sent to ${m.email}. It works once and expires in 24 hours.`,
    );
  const switchOff = () => {
    updateMember(m.id, { status: "Disabled", devices: [] });
    setAsk(null);
    done("Access switched off", `${m.name} is signed out everywhere.`);
  };
  const switchOn = () => {
    updateMember(m.id, { status: "Active" });
    done("Access switched on", `${m.name} can sign in again.`);
  };
  const remove = () => {
    removeMember(m.id);
    setAsk(null);
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
            tone={
              SECURITY.locked && !isOwnerRole
                ? "mute"
                : m.status === "Active"
                  ? "ok"
                  : m.status === "Invited"
                    ? "info"
                    : "bad"
            }
          >
            {SECURITY.locked && !isOwnerRole
              ? "Locked"
              : m.status === "Disabled"
                ? "Switched off"
                : m.status === "Invited"
                  ? "Invited · not joined yet"
                  : m.status}
          </StatusBadge>
        </div>
      </div>
      {m.status === "Disabled" && (
        <div className="mb-[18px] rounded-[10px] border border-bad-bg bg-bad-bg px-4 py-3 text-[13px]">
          ⛔ <b className="font-medium">Access switched off.</b> {m.name} can't sign in. Everything
          they did stays in the Activity log.
        </div>
      )}
      <div className="grid items-stretch gap-[18px] min-[981px]:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <section className={box}>
            <h3 className="mb-3 text-[15px]">Details & role</h3>
            {isOwnerRole && (
              <p className="mb-3 text-[13px] text-muted-foreground">
                Owner — full access. There is one Owner, and it can never be changed or removed.
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
            <div className="mt-3.5 flex flex-col gap-1.5 text-[12px] text-muted-foreground">
              Role
              {isOwnerRole ? (
                <input readOnly value="Owner — fixed" className={cn(inputCls, "bg-[#f7f7f7]")} />
              ) : (
                <SearchSelect
                  value={roleId}
                  items={roles
                    .filter((r) => r.id !== "owner")
                    .map((r) => ({ value: r.id, label: r.name }))}
                  onChange={(v) => edit && v && setRoleId(v)}
                  searchable={false}
                  className={cn("text-[14px]", !edit && "pointer-events-none opacity-60")}
                />
              )}
              <span>
                {isOwnerRole
                  ? "The Owner role can't be changed."
                  : "Changing the role changes what they can open straight away."}
              </span>
            </div>
            {!isOwnerRole && (
              <div className="mt-3.5 flex max-w-[300px] flex-col gap-1.5 text-[12px] text-muted-foreground">
                Access ends (optional)
                <div className={cn(!edit && "pointer-events-none opacity-60")}>
                  <DateField value={ends} onChange={setEnds} />
                </div>
                <span>
                  On this date they are switched off automatically — for temporary or seasonal
                  staff.
                </span>
              </div>
            )}
            {edit && (
              <div className="mt-4 flex gap-2">
                <Button primary onClick={save} disabled={!dirty}>
                  Save
                </Button>
                <Link to="/staff/role/$roleId" params={{ roleId: role.id }}>
                  <Button>Open this role</Button>
                </Link>
              </div>
            )}
          </section>
          <section className={cn(box, "mb-0")}>
            <h3 className="mb-1 text-[15px]">What {first} can open</h3>
            {isOwnerRole ? (
              <p className="py-2 text-[13px] text-muted-foreground">Everything.</p>
            ) : (
              <>
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
                          <span className="w-[22px] text-center text-muted-foreground">
                            {p.icon}
                          </span>
                          <span className="flex-1">{p.label}</span>
                          <span className={cn("rounded-full px-2.5 py-0.5 text-[12px]", c)}>
                            {l}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
                <h5 className="mb-1 mt-4 text-[10.5px] font-normal uppercase tracking-[.14em] text-muted-foreground">
                  Limits
                </h5>
                <p className="text-[12.5px] text-muted-foreground">
                  Refund up to {role.limits.refund.toLocaleString("en-US")} EGP each,{" "}
                  {role.limits.refundDay.toLocaleString("en-US")} EGP per day · Discount up to{" "}
                  {role.limits.discount}% · Price change up to {role.limits.price}%
                </p>
              </>
            )}
          </section>
        </div>
        <StickyCol>
          <section className={box}>
            <h3 className="mb-3 text-[15px]">Sign-in</h3>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-[13px]">
              <dt className="text-muted-foreground">Username</dt>
              <dd className="text-right font-mono text-[12px]">{m.username}</dd>
              <dt className="text-muted-foreground">Last seen</dt>
              <dd className="text-right">{m.lastSeen}</dd>
              <dt className="text-muted-foreground">2-step code</dt>
              <dd className="text-right text-good">
                {m.status === "Invited" ? "Set when they join" : "✓ On · required"}
              </dd>
            </dl>
          </section>
          {m.status !== "Invited" && (
            <section className={box}>
              <h3 className="mb-3 text-[15px]">Devices signed in</h3>
              {m.devices.length ? (
                m.devices.map((d, i) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between border-t border-line-soft py-2.5 text-[13.5px] first:border-0"
                  >
                    <div>
                      <b className="block font-medium">{d.browser}</b>
                      <small className="text-[12px] text-muted-foreground">
                        {d.city} · {d.seen}
                      </small>
                    </div>
                    {isOwnerRole && i === 0 ? (
                      <span className="text-[12px] text-muted-foreground">This device</span>
                    ) : (
                      <button
                        type="button"
                        className="text-[12.5px] underline underline-offset-[3px]"
                        onClick={() => {
                          updateMember(m.id, { devices: m.devices.filter((x) => x.id !== d.id) });
                          done("Signed out", "That device has been signed out.");
                        }}
                      >
                        Sign out
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-[13px] text-muted-foreground">No devices signed in.</p>
              )}
              {m.devices.length > 0 && !isOwnerRole && owner && (
                <div className="mt-2.5">
                  <Button
                    className="w-full"
                    onClick={() => {
                      updateMember(m.id, { devices: [] });
                      done(
                        "Signed out everywhere",
                        `${m.name} must sign in again on every device.`,
                      );
                    }}
                  >
                    Sign out everywhere
                  </Button>
                </div>
              )}
            </section>
          )}
          {owner && (
            <section className={box}>
              <h3 className="mb-1 text-[15px]">Password</h3>
              <p className="mb-3 text-[12.5px] text-muted-foreground">
                {isOwnerRole
                  ? "Change your own password, or use your backup email if you lose access."
                  : "You never need their password. They set their own from a link sent to their work email."}
              </p>
              <Button primary className="w-full" onClick={resetLink}>
                Send reset link by email
              </Button>
            </section>
          )}
          {edit && (
            <section className="rounded-[10px] border border-bad-bg bg-surface px-5 pb-5 pt-4">
              <h3 className="mb-3 text-[15px] text-bad">Leaving the team</h3>
              <p className="mb-3 text-[13px]">
                Switching access off signs {first} out everywhere, immediately. Their history stays.
                Removing them deletes the account.
              </p>
              <div className="flex flex-col gap-2">
                {m.status === "Disabled" ? (
                  <Button onClick={switchOn}>Switch access back on</Button>
                ) : (
                  <Button onClick={() => setAsk("off")}>Switch off access now</Button>
                )}
                <Button onClick={() => setAsk("remove")}>Remove from team</Button>
              </div>
            </section>
          )}
        </StickyCol>
      </div>

      <Dialog open={ask === "off"} onOpenChange={(o) => !o && setAsk(null)}>
        <DialogContent className="max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="font-head text-[18px] font-normal">
              Switch off access for {m.name}?
            </DialogTitle>
          </DialogHeader>
          <p className="text-[13.5px]">
            They are signed out everywhere straight away and can't sign in again, even with their
            password. Their history and the Activity log stay.
          </p>
          <DialogFooter>
            <Button onClick={() => setAsk(null)}>Cancel</Button>
            <button type="button" className={redBtn} onClick={switchOff}>
              Switch off now
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={ask === "remove"} onOpenChange={(o) => !o && setAsk(null)}>
        <DialogContent className="max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="font-head text-[18px] font-normal">
              Remove {m.name} from the team?
            </DialogTitle>
          </DialogHeader>
          <p className="text-[13.5px]">
            The account is deleted and they are signed out everywhere. What they did stays in the
            Activity log under their name. This can't be undone — to keep the account, switch access
            off instead.
          </p>
          <DialogFooter>
            <Button onClick={() => setAsk(null)}>Cancel</Button>
            <button type="button" className={redBtn} onClick={remove}>
              Remove
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {doneNode}
    </>
  );
}
