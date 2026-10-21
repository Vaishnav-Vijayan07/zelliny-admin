import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ACTIONS,
  SECTION_GROUPS,
  deleteRole,
  freshRoles,
  setAction,
  setLevel,
  updateRole,
  useMembers,
  useRoles,
  type Level,
} from "@/lib/team-store";
import { Avatar, Toggle } from "@/components/admin/primitives";
import { Button } from "@/components/admin/page";
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
const LEVELS: [Level, string][] = [
  ["none", "No access"],
  ["view", "View only"],
  ["edit", "Can edit"],
];

export default function StaffRolePage({ roleId }: { roleId: string }) {
  const roles = useRoles();
  const members = useMembers();
  const owner = useIsOwner();
  const navigate = useNavigate();
  const role = roles.find((r) => r.id === roleId);
  const [name, setName] = useState(role?.name ?? "");
  const [desc, setDesc] = useState(role?.description ?? "");
  const [limits, setLimits] = useState(role?.limits);
  const [doneNode, done] = useDone();
  const [askDelete, setAskDelete] = useState(false);
  useEffect(() => {
    setName(role?.name ?? "");
    setDesc(role?.description ?? "");
    setLimits(role?.limits);
  }, [role?.id]);

  if (!role)
    return <p className="py-24 text-center text-muted-foreground">This role was not found.</p>;
  const editable = owner && !role.locked;
  const people = members.filter((m) => m.roleId === role.id);

  const saveDetails = () => {
    const n = name.trim();
    if (!n) {
      toast("The role needs a name");
      return;
    }
    if (roles.some((r) => r.id !== role.id && r.name.toLowerCase() === n.toLowerCase())) {
      toast(`A role called "${n}" already exists`);
      return;
    }
    updateRole(role.id, { name: n, description: desc.trim(), ...(limits ? { limits } : {}) });
    done(
      "Role saved",
      people.length
        ? `Applies now to the ${people.length} ${people.length === 1 ? "person" : "people"} in this role.`
        : "Add people to this role from their page.",
    );
  };
  const remove = () => {
    deleteRole(role.id);
    setAskDelete(false);
    toast(`${role.name} deleted`);
    navigate({ to: "/staff" });
  };

  return (
    <>
      <div className="mb-[22px]">
        <div className="mb-2 text-[12px] text-muted-foreground">
          <Link to="/staff" className="underline underline-offset-[3px]">
            Team & permissions
          </Link>{" "}
          / {role.name}
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] leading-tight">{role.name}</h1>
            <p className="mt-1 text-muted-foreground">
              {role.locked ? "The owner role always has everything." : role.description}
            </p>
          </div>
          {editable && (
            <Button primary onClick={saveDetails}>
              Save role
            </Button>
          )}
        </div>
      </div>
      {freshRoles.has(role.id) && (
        <div className="mb-[18px] rounded-[10px] border border-[#cfe3d7] bg-good-bg px-4 py-3 text-[13.5px] text-[#1f5e3e]">
          Role created. Every section is set — choose what it can open, then press "Save role".
        </div>
      )}
      <div className="grid items-start gap-[18px] min-[981px]:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {editable && (
            <section className="mb-[18px] rounded-[10px] border border-border bg-surface px-5 pb-5 pt-4">
              <h3 className="mb-3 text-[15px]">Name</h3>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-[12px] text-muted-foreground">
                  Role name
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputCls}
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-[12px] text-muted-foreground">
                  What this role is for
                  <input
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="One line, so everyone understands it"
                    className={inputCls}
                  />
                </label>
              </div>
            </section>
          )}
          <section className="mb-[18px] rounded-[10px] border border-border bg-surface px-5 pb-5 pt-4">
            <h3 className="mb-1 text-[15px]">What this role can open</h3>
            {role.locked ? (
              <p className="py-2 text-[13px] text-muted-foreground">
                Everything — including Team & permissions, Tracking & scripts and Settings, which
                only the owner can open.
              </p>
            ) : (
              <>
                {SECTION_GROUPS.map((g) => (
                  <div key={g.title}>
                    <div className="mb-1 mt-4 flex items-center justify-between">
                      <h5 className="text-[10.5px] font-normal uppercase tracking-[.14em] text-muted-foreground">
                        {g.title}
                      </h5>
                      {editable && (
                        <span className="flex gap-3 text-[11.5px] text-muted-foreground">
                          <button
                            type="button"
                            className="underline underline-offset-2"
                            onClick={() => g.pages.forEach((p) => setLevel(role.id, p.key, "edit"))}
                          >
                            Allow all
                          </button>
                          <button
                            type="button"
                            className="underline underline-offset-2"
                            onClick={() => g.pages.forEach((p) => setLevel(role.id, p.key, "none"))}
                          >
                            Clear all
                          </button>
                        </span>
                      )}
                    </div>
                    {g.pages.map((p) => (
                      <div
                        key={p.key}
                        className="flex items-center gap-3.5 border-b border-line-soft py-2.5 text-[13.5px] last:border-b-0"
                      >
                        <span className="w-[22px] text-center text-muted-foreground">{p.icon}</span>
                        <span className="flex-1">{p.label}</span>
                        <div
                          className={cn(
                            "inline-flex gap-0.5 rounded-lg border border-border bg-surface p-0.5",
                            !editable && "pointer-events-none opacity-55",
                          )}
                        >
                          {LEVELS.map(([lv, label]) => (
                            <button
                              key={lv}
                              type="button"
                              onClick={() =>
                                setLevel(
                                  role.id,
                                  p.key,
                                  lv !== "none" && role.access[p.key] === lv ? "none" : lv,
                                )
                              }
                              className={cn(
                                "whitespace-nowrap rounded-md px-3 py-1 text-[12px]",
                                (role.access[p.key] ?? "none") === lv
                                  ? lv === "view"
                                    ? "bg-info text-white"
                                    : lv === "edit"
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-muted text-foreground"
                                  : "text-muted-foreground",
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                <p className="mt-3 text-[12px] text-muted-foreground">
                  Anything set to “No access” disappears from the menu. Activity log, Team &
                  permissions, Tracking & scripts and Settings are for the owner only.
                </p>
              </>
            )}
          </section>
          {!role.locked && limits && (
            <section className="mb-[18px] rounded-[10px] border border-border bg-surface px-5 pb-5 pt-4">
              <h3 className="mb-1 text-[15px]">Limits</h3>
              <p className="mb-3.5 text-[12px] text-muted-foreground">
                Above these, the change doesn't happen — it waits for your approval under "Waiting
                for approval", and you get an email and WhatsApp.
              </p>
              <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                {(
                  [
                    ["refund", "Refund up to (EGP)", "Each refund"],
                    ["refundDay", "Refunds per day (EGP)", "All refunds by one person in a day"],
                    ["discount", "Discount up to (%)", "Codes and offers"],
                    ["price", "Price change up to (%)", "Up or down, on Products"],
                  ] as const
                ).map(([k, label, note]) => (
                  <label
                    key={k}
                    className="flex flex-col gap-1.5 text-[12px] text-muted-foreground"
                  >
                    {label}
                    <input
                      type="number"
                      disabled={!editable}
                      value={limits[k]}
                      onChange={(e) => setLimits({ ...limits, [k]: Number(e.target.value) })}
                      className={cn(
                        inputCls,
                        "disabled:opacity-60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none",
                      )}
                    />
                    <span>{note}</span>
                  </label>
                ))}
              </div>
            </section>
          )}
          {!role.locked && (
            <section className="mb-[18px] rounded-[10px] border border-border bg-surface px-5 pb-3 pt-4">
              <h3 className="mb-1 text-[15px]">Actions</h3>
              {ACTIONS.map((a) => (
                <div
                  key={a.key}
                  className="flex items-center justify-between gap-3.5 border-b border-line-soft py-2.5 last:border-b-0"
                >
                  <div>
                    <div className="text-[13.5px]">{a.label}</div>
                    <div className="mt-0.5 text-[12px] text-muted-foreground">{a.hint}</div>
                  </div>
                  <span className={cn(!editable && "pointer-events-none opacity-55")}>
                    <Toggle
                      on={!!role.actions[a.key]}
                      onChange={() => setAction(role.id, a.key, !role.actions[a.key])}
                      label={a.label}
                    />
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between gap-3.5 border-t border-line-soft py-2.5">
                <div>
                  <div className="text-[13.5px]">Delete</div>
                  <div className="mt-0.5 text-[12px] text-muted-foreground">
                    Owner only — staff can switch off or archive, never delete
                  </div>
                </div>
                <span className="pointer-events-none opacity-40">
                  <Toggle on={false} onChange={() => {}} label="Delete" />
                </span>
              </div>
            </section>
          )}
        </div>
        <StickyCol>
          <section className="mb-[18px] rounded-[10px] border border-border bg-surface px-5 pb-5 pt-4">
            <h3 className="mb-3 text-[15px]">People in this role</h3>
            {people.length ? (
              people.map((m) => (
                <Link
                  key={m.id}
                  to="/staff/member/$memberId"
                  params={{ memberId: m.id }}
                  className="flex items-center gap-2.5 py-1.5"
                >
                  <Avatar name={m.name} className="size-[30px] text-[11px]" />
                  <div>
                    <b className="text-[13.5px] font-medium">{m.name}</b>
                    <div className="text-[12px] text-muted-foreground">{m.email}</div>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-[13px] text-muted-foreground">
                No one yet. Assign it from a person's page.
              </p>
            )}
          </section>
          {editable && (
            <section className="rounded-[10px] border border-bad-bg bg-surface px-5 pb-5 pt-4">
              <h3 className="mb-3 text-[15px] text-bad">Delete role</h3>
              {people.length ? (
                <p className="text-[13px] text-muted-foreground">
                  Move {people.length === 1 ? "this person" : "these people"} to another role first.
                </p>
              ) : (
                <>
                  <p className="mb-3 text-[13px]">Nobody uses this role.</p>
                  <Button onClick={() => setAskDelete(true)}>Delete role</Button>
                </>
              )}
            </section>
          )}
        </StickyCol>
      </div>
      <Dialog open={askDelete} onOpenChange={setAskDelete}>
        <DialogContent className="max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="font-head text-[18px] font-normal">
              Delete {role.name}?
            </DialogTitle>
          </DialogHeader>
          <p className="text-[13.5px]">Nobody is in this role. It will be removed for good.</p>
          <DialogFooter>
            <Button onClick={() => setAskDelete(false)}>Cancel</Button>
            <button
              type="button"
              className="h-9 rounded-lg bg-bad px-4 text-[13.5px] text-white"
              onClick={remove}
            >
              Delete role
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {doneNode}
    </>
  );
}
