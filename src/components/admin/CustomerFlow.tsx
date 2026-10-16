// Customers: local changes, Excel export, email / WhatsApp / SMS composers and the add-edit form.
// Shared by the Customers list and the single-customer page.
// Everything is local for now — swap addCustomer / editCustomer / sends for API calls.
import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import type { CustomerAddress, CustomerRow, OrderEvent } from "@/lib/api/section-types";
import { cn } from "@/lib/utils";
import { useSessionUser } from "@/hooks/use-session";
import { Button } from "./page";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fillTemplate, useMessageTemplates } from "./MessageTemplates";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/* ---------- local store ---------- */
type Edit = Partial<CustomerRow> & { messages?: OrderEvent[] };
let created: CustomerRow[] = [];
let edits: Record<string, Edit> = {};
const listeners = new Set<() => void>();
const sub = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const emit = () => listeners.forEach((l) => l());
const NO_ROWS: CustomerRow[] = [];
const NO_EDITS: Record<string, Edit> = {};
export type LiveCustomer = CustomerRow & { messages: OrderEvent[]; isNew: boolean };

export function useCustomers(rows: CustomerRow[]): LiveCustomer[] {
  const c = useSyncExternalStore(
    sub,
    () => created,
    () => NO_ROWS,
  );
  const e = useSyncExternalStore(
    sub,
    () => edits,
    () => NO_EDITS,
  );
  return useMemo(
    () =>
      [...c, ...rows].map((r) => {
        const x = e[r.id];
        return { ...r, ...x, messages: x?.messages ?? [], isNew: c.includes(r) };
      }),
    [c, rows, e],
  );
}
export function addCustomer(r: CustomerRow) {
  created = [r, ...created];
  emit();
}
export function editCustomer(id: string, e: Partial<CustomerRow>) {
  edits = { ...edits, [id]: { ...edits[id], ...e } };
  emit();
}
/* ---------- saved addresses ---------- */
/** Puts the default address (or the first) into `address` / `city`, which the rest of the app reads. */
const withPrimary = (addresses: CustomerAddress[]): Partial<CustomerRow> => {
  const list = addresses.some((a) => a.isDefault)
    ? addresses
    : addresses.map((a, i) => ({ ...a, isDefault: i === 0 }));
  const d = list.find((a) => a.isDefault);
  return { addresses: list, address: d?.address ?? "", ...(d ? { city: d.city } : {}) };
};
export const ADDRESS_LABELS = ["Home", "Work", "Other"];
export function saveAddress(
  c: CustomerRow,
  a: { id: string | null; label: string; address: string; city: string; isDefault: boolean },
) {
  const id = a.id ?? `${c.id}-a${Date.now().toString(36)}`;
  const row: CustomerAddress = {
    id,
    label: a.label,
    address: a.address,
    city: a.city,
    isDefault: a.isDefault,
  };
  const base = a.id ? c.addresses.map((x) => (x.id === a.id ? row : x)) : [...c.addresses, row];
  const next = base.map((x) => (a.isDefault ? { ...x, isDefault: x.id === id } : x));
  editCustomer(c.id, withPrimary(next));
}
export function deleteAddress(c: CustomerRow, id: string) {
  editCustomer(c.id, withPrimary(c.addresses.filter((x) => x.id !== id)));
}
export function makeDefaultAddress(c: CustomerRow, id: string) {
  editCustomer(c.id, withPrimary(c.addresses.map((x) => ({ ...x, isDefault: x.id === id }))));
}

function recordMessage(id: string, m: OrderEvent) {
  const cur = edits[id] ?? {};
  edits = { ...edits, [id]: { ...cur, messages: [...(cur.messages ?? []), m] } };
  emit();
}

/* ---------- who can be reached ---------- */
export type Channel = "Email" | "WhatsApp" | "SMS";
export const canReach = (c: CustomerRow, via: Channel) =>
  via === "Email"
    ? !!c.email && c.marketing.email
    : via === "WhatsApp"
      ? !!c.phone && c.marketing.whatsapp
      : !!c.phone && c.marketing.sms;
export const whyNot = (c: CustomerRow, via: Channel) =>
  via === "Email"
    ? !c.email
      ? "no email on file"
      : "said no to emails"
    : !c.phone
      ? "no mobile on file"
      : via === "WhatsApp"
        ? "said no to WhatsApp"
        : "said no to SMS";
const first = (n: string) => n.split(" ")[0] ?? n;

/** Email / WhatsApp / SMS — struck through when the customer can't be reached that way. */
export function ReachChips({ c }: { c: LiveCustomer }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {(["Email", "WhatsApp", "SMS"] as Channel[]).map((v) => (
        <span
          key={v}
          title={canReach(c, v) ? `Can receive ${v}` : whyNot(c, v)}
          className={cn(
            "whitespace-nowrap rounded-full border border-border px-2 py-px text-[11px]",
            !canReach(c, v) && "line-through opacity-40",
          )}
        >
          {v}
        </span>
      ))}
    </span>
  );
}

/* ---------- Excel download (CSV, opens in Excel; UTF-8 so Arabic names survive) ---------- */
export function downloadCsv(name: string, head: string[], rows: (string | number)[][]) {
  const cell = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [head, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 500);
}
export const EXPORT_COLUMNS: [string, string, (c: CustomerRow) => string | number][] = [
  ["name", "Name", (c) => c.name],
  ["email", "Email", (c) => c.email],
  ["phone", "Mobile", (c) => c.phone],
  ["city", "City", (c) => c.city],
  ["orders", "Orders", (c) => c.orders],
  ["spent", "Total spent (EGP)", (c) => c.spent],
  ["since", "Customer since", (c) => c.since],
  [
    "ok",
    "Agreed to email / SMS / WhatsApp",
    (c) =>
      [c.marketing.email, c.marketing.sms, c.marketing.whatsapp]
        .map((x) => (x ? "Yes" : "No"))
        .join(" / "),
  ],
];

/* ---------- small pieces ---------- */
const input =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-primary";
const Title = ({ children, sub: s }: { children: ReactNode; sub?: ReactNode }) => (
  <DialogHeader>
    <DialogTitle className="font-head text-[18px] font-normal">{children}</DialogTitle>
    {s && <p className="text-[12.5px] text-muted-foreground">{s}</p>}
  </DialogHeader>
);
function Field({
  label,
  req,
  children,
  hint,
  bad,
}: {
  label: string;
  req?: boolean;
  children: ReactNode;
  hint?: ReactNode;
  bad?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex min-w-0 flex-col gap-1.5 text-[12px] text-muted-foreground",
        bad && "[&_input]:border-bad",
      )}
    >
      <span>
        {label}
        {req && <em className="not-italic text-bad"> *</em>}
      </span>
      {children}
      {hint && <span className="text-[11.5px]">{hint}</span>}
    </label>
  );
}
const Primary = ({
  disabled,
  onClick,
  children,
}: {
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className="rounded-lg border border-primary bg-primary px-4 py-2 text-[13px] text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
  >
    {children}
  </button>
);
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
function Reach({ list, via }: { list: CustomerRow[]; via: Channel }) {
  const ok = list.filter((c) => canReach(c, via)),
    skip = list.filter((c) => !canReach(c, via));
  return (
    <div className="rounded-lg border border-border px-3.5 py-3 text-[13px]">
      <div>
        <b className="mr-1 text-[16px] font-medium">{ok.length}</b> of {list.length} will receive it
        by {via}
      </div>
      {skip.length > 0 && (
        <div className="mt-1.5 text-[12.5px] text-warn">
          <b className="font-semibold">{skip.length} skipped</b> —{" "}
          {skip
            .map((c) => (
              <span key={c.id}>
                {c.name} <em className="not-italic text-muted-foreground">({whyNot(c, via)})</em>
              </span>
            ))
            .reduce<ReactNode[]>((a, x, i) => (i ? [...a, ", ", x] : [x]), [])}
        </div>
      )}
    </div>
  );
}

/* ---------- dialogs, opened through one hook ---------- */
type Open =
  | { kind: "send"; list: LiveCustomer[]; channel: Channel; ref: SendRef }
  | { kind: "export"; list: LiveCustomer[]; scope?: string }
  | { kind: "form"; customer: LiveCustomer | null };

export type SendRef = { tpl?: string; product?: string; order?: string };

/**
 * `send(list, channel, ref?)`, `exportTo(list, scope)` and `form(customer | null)` open the dialogs.
 * Render `dialog` once on the page.
 */
export function useCustomerActions(all: LiveCustomer[], onSaved?: (id: string) => void) {
  const user = useSessionUser();
  const me = user?.name ?? "You";
  const [open, setOpen] = useState<Open | null>(null);
  const close = () => setOpen(null);

  /* send */
  const [tplId, setTplId] = useState("thanks");
  const [subject, setSubject] = useState("A note from Zelliny");
  const [body, setBody] = useState("");
  const [when, setWhen] = useState("Now");
  const [at, setAt] = useState("");
  const templates = useMessageTemplates();
  const navigate = useNavigate();
  /* export */
  const [cols, setCols] = useState<string[]>(EXPORT_COLUMNS.map((c) => c[0]));
  /* form */
  const [f, setF] = useState({
    name: "",
    phone: "",
    email: "",
    language: "English",
    city: "New Cairo",
    address: "",
    birthday: "",
    source: "Phone call",
    notes: "",
    me: true,
    ms: true,
    mw: true,
  });
  const [bad, setBad] = useState<string[]>([]);
  const [err, setErr] = useState<ReactNode>("");

  const send = (list: LiveCustomer[], channel: Channel, ref: SendRef = {}) => {
    const tpl = templates.find((t) => t.id === (ref.tpl ?? (list.length > 1 ? "promo" : "thanks")));
    const t = tpl ?? templates[0]!;
    setTplId(t.id);
    setBody(
      fillTemplate(t.text, {
        ...(ref.product ? { product: ref.product } : {}),
        ...(ref.order ? { order: ref.order } : {}),
      }),
    );
    setSubject("A note from Zelliny");
    setWhen("Now");
    setAt("");
    setErr("");
    setOpen({ kind: "send", list, channel, ref });
  };
  const exportTo = (list: LiveCustomer[], scope: string) => {
    setCols(EXPORT_COLUMNS.map((c) => c[0]));
    setOpen({ kind: "export", list, scope });
  };
  const form = (c: LiveCustomer | null) => {
    setBad([]);
    setErr("");
    setF(
      c
        ? {
            name: c.name,
            phone: c.phone,
            email: c.email,
            language: c.language,
            city: CITIES.includes(c.city) ? c.city : "Other",
            address: c.address,
            birthday: c.birthday,
            source: c.source,
            notes: c.notes,
            me: c.marketing.email,
            ms: c.marketing.sms,
            mw: c.marketing.whatsapp,
          }
        : {
            name: "",
            phone: "",
            email: "",
            language: "English",
            city: "New Cairo",
            address: "",
            birthday: "",
            source: "Phone call",
            notes: "",
            me: true,
            ms: true,
            mw: true,
          },
    );
    setOpen({ kind: "form", customer: c });
  };

  const doSend = () => {
    if (open?.kind !== "send") return;
    const { channel } = open;
    if (!body.trim() || (channel === "Email" && !subject.trim())) {
      setErr(channel === "Email" ? "Add a subject and a message." : "Write the message.");
      return;
    }
    if (when === "pick" && !at) {
      setErr("Pick the date and time to send.");
      return;
    }
    const list = open.list.filter((c) => canReach(c, channel));
    const whenTxt =
      when === "pick"
        ? new Date(at).toLocaleString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : when;
    list.forEach((c) =>
      recordMessage(c.id, {
        text: `${channel} · “${(channel === "Email" ? subject : body).trim().slice(0, 60)}”`,
        when: when === "Now" ? "Today, just now" : `Scheduled · ${whenTxt}`,
        who: me,
      }),
    );
    close();
    toast(
      `${channel} ${when === "Now" ? "sent" : `scheduled for ${whenTxt}`} to ${plural(list.length, "customer")}`,
    );
  };
  const doExport = () => {
    if (open?.kind !== "export") return;
    const use = EXPORT_COLUMNS.filter((c) => cols.includes(c[0]));
    if (!use.length) {
      toast("Choose at least one column");
      return;
    }
    downloadCsv(
      `zelliny-customers-${open.list.length}.csv`,
      use.map((c) => c[1]),
      open.list.map((c) => use.map((x) => x[2](c))),
    );
    close();
    toast(`Excel downloaded · ${plural(open.list.length, "customer")}`);
  };
  const save = () => {
    if (open?.kind !== "form") return;
    const digits = f.phone.replace(/\D/g, "");
    const b = [
      ...(!f.name.trim() ? ["name"] : []),
      ...(digits.length < 10 ? ["phone"] : []),
      ...(f.email && !/^\S+@\S+\.\S+$/.test(f.email) ? ["email"] : []),
    ];
    setBad(b);
    if (b.length) {
      setErr(
        b.length === 1 && b[0] === "email"
          ? "Check the email address"
          : "Please fill in the fields marked in red",
      );
      return;
    }
    const id = open.customer?.id;
    const dup = all.find(
      (c) =>
        c.id !== id &&
        (c.phone.replace(/\D/g, "").slice(-10) === digits.slice(-10) ||
          (!!f.email && c.email.toLowerCase() === f.email.toLowerCase())),
    );
    if (dup) {
      setErr(
        <>
          Already a customer:{" "}
          <button
            type="button"
            className="underline"
            onClick={() => {
              close();
              onSaved?.(dup.id);
            }}
          >
            {dup.name} →
          </button>
        </>,
      );
      return;
    }
    const vals = {
      name: f.name.trim(),
      phone: f.phone.trim(),
      email: f.email.trim(),
      language: f.language as CustomerRow["language"],
      city: f.city,
      address: f.address.trim(),
      birthday: f.birthday.trim(),
      source: f.source,
      notes: f.notes.trim(),
      marketing: { email: f.me && !!f.email.trim(), sms: f.ms, whatsapp: f.mw },
    };
    if (id) {
      const cur = all.find((c) => c.id === id);
      const list = cur?.addresses ?? [];
      const addresses = !vals.address
        ? list
        : list.some((a) => a.isDefault)
          ? list.map((a) => (a.isDefault ? { ...a, address: vals.address, city: vals.city } : a))
          : [
              ...list,
              {
                id: `${id}-a1`,
                label: "Home",
                address: vals.address,
                city: vals.city,
                isDefault: true,
              },
            ];
      editCustomer(id, { ...vals, addresses });
      close();
      toast("Customer details saved");
      onSaved?.(id);
      return;
    }
    const nid = `C${Math.max(0, ...all.map((c) => Number(c.id.slice(1)) || 0)) + 1}`;
    addCustomer({
      id: nid,
      orders: 0,
      spent: 0,
      since: "Sep 2026",
      ...vals,
      addresses: vals.address
        ? [
            {
              id: `${nid}-a1`,
              label: "Home",
              address: vals.address,
              city: vals.city,
              isDefault: true,
            },
          ]
        : [],
    });
    close();
    toast(`${vals.name} added as a customer`);
    onSaved?.(nid);
  };

  const list = open && open.kind !== "form" ? open.list : [];
  const one = list.length === 1 ? list[0]! : null;
  const okN = open?.kind === "send" ? list.filter((c) => canReach(c, open.channel)).length : 0;

  const dialog = (
    <Dialog open={!!open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-h-[88vh] max-w-[760px] overflow-y-auto">
        {open?.kind === "send" && (
          <>
            <Title>
              {open.channel} to {one ? one.name : `${list.length} customers`}
            </Title>
            <Reach list={list} via={open.channel} />
            <div className="grid gap-3.5 md:grid-cols-2">
              <Field
                label="Template"
                hint={
                  <button
                    type="button"
                    className="underline"
                    onClick={() => {
                      close();
                      navigate({
                        to: "/settings",
                        search: { tab: "templates", from: one?.id ?? "customers" },
                      });
                    }}
                  >
                    Manage templates
                  </button>
                }
              >
                <select
                  value={tplId}
                  className={input}
                  onChange={(e) => {
                    const t = templates.find((x) => x.id === e.target.value);
                    if (!t) return;
                    setTplId(t.id);
                    setBody(
                      fillTemplate(t.text, {
                        ...(open.ref.product ? { product: open.ref.product } : {}),
                        ...(open.ref.order ? { order: open.ref.order } : {}),
                      }),
                    );
                  }}
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Send">
                <select
                  value={when}
                  className={input}
                  onChange={(e) => {
                    setWhen(e.target.value);
                    setErr("");
                  }}
                >
                  <option value="Now">Now</option>
                  <option value="Tomorrow 10:00">Tomorrow 10:00</option>
                  <option value="pick">Pick date &amp; time…</option>
                </select>
              </Field>
            </div>
            {when === "pick" && (
              <Field label="Date & time">
                <input
                  type="datetime-local"
                  value={at}
                  min={new Date().toISOString().slice(0, 16)}
                  onChange={(e) => setAt(e.target.value)}
                  onClick={(e) => {
                    try {
                      e.currentTarget.showPicker();
                    } catch {
                      /* not supported */
                    }
                  }}
                  className={input}
                />
              </Field>
            )}
            {open.channel === "Email" && (
              <Field label="Subject">
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject line"
                  className={input}
                />
              </Field>
            )}
            <Field
              label="Message"
              hint={
                <>
                  <b>{"{first_name}"}</b> is replaced by each customer's first name.
                  {open.channel === "Email" && " Every bulk email carries an unsubscribe link."}
                </>
              }
            >
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={open.channel === "Email" ? 7 : 4}
                className={cn(input, "h-auto py-2")}
              />
            </Field>
            <div
              className={cn(
                "rounded-lg p-3.5",
                open.channel === "Email" ? "bg-hover" : "bg-[#efe7dd]",
              )}
            >
              <small className="mb-1.5 block text-[10.5px] uppercase tracking-[.1em] text-muted-foreground">
                Preview{list[0] ? ` · ${list[0].name}` : ""}
              </small>
              <div className="max-w-[85%] whitespace-pre-wrap rounded-lg bg-white px-3 py-2.5 text-[13px] leading-normal shadow-sm">
                {open.channel === "Email" && <b className="mb-1 block">{subject}</b>}
                {fillTemplate(body, { firstName: list[0] ? first(list[0].name) : "" })}
              </div>
            </div>
            {err && <p className="text-[12.5px] text-bad">{err}</p>}
            <DialogFooter>
              <Button onClick={close}>Cancel</Button>
              <Primary disabled={!okN} onClick={doSend}>
                {okN
                  ? `${when === "Now" ? "Send" : "Schedule"} ${open.channel === "Email" ? "email" : open.channel} to ${okN}`
                  : "Nobody to send to"}
              </Primary>
            </DialogFooter>
          </>
        )}

        {open?.kind === "export" && (
          <>
            <Title sub={open.scope}>Export {plural(list.length, "customer")} to Excel</Title>
            <div className="text-[10.5px] uppercase tracking-[.2em] text-muted-foreground">
              Columns
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {EXPORT_COLUMNS.map(([k, label]) => (
                <label key={k} className="flex items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    className="accent-[#0a0a0a]"
                    checked={cols.includes(k)}
                    onChange={() =>
                      setCols((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]))
                    }
                  />{" "}
                  {label}
                </label>
              ))}
            </div>
            <p className="text-[12px] text-muted-foreground">
              Downloads a spreadsheet that opens in Excel. Arabic names are kept as they are.
            </p>
            <DialogFooter>
              <Button onClick={close}>Cancel</Button>
              <Primary onClick={doExport}>Download Excel</Primary>
            </DialogFooter>
          </>
        )}

        {open?.kind === "form" && (
          <>
            <Title
              sub={
                open.customer
                  ? `${open.customer.name} · ${open.customer.id}`
                  : "For customers who buy by phone, WhatsApp or in person. Website customers are added automatically when they sign up or order."
              }
            >
              {open.customer ? "Edit customer" : "Add customer"}
            </Title>
            <Section>Contact</Section>
            <div className="grid gap-3.5 md:grid-cols-2">
              <Field label="Full name" req bad={bad.includes("name")}>
                <input
                  value={f.name}
                  onChange={(e) => setF({ ...f, name: e.target.value })}
                  placeholder="e.g. Mariam Adel"
                  className={input}
                  autoFocus
                />
              </Field>
              <Field label="Mobile" req bad={bad.includes("phone")}>
                <input
                  value={f.phone}
                  onChange={(e) => setF({ ...f, phone: e.target.value })}
                  placeholder="+20 1xx xxx xxxx"
                  className={input}
                />
              </Field>
              <Field label="Email" bad={bad.includes("email")}>
                <input
                  value={f.email}
                  onChange={(e) => setF({ ...f, email: e.target.value })}
                  placeholder="name@example.com"
                  className={input}
                />
              </Field>
              <Field label="City">
                <select
                  value={f.city}
                  onChange={(e) => setF({ ...f, city: e.target.value })}
                  className={input}
                >
                  {CITIES.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </Field>
              <Field label="Language">
                <select
                  value={f.language}
                  onChange={(e) => setF({ ...f, language: e.target.value })}
                  className={input}
                >
                  <option>English</option>
                  <option>Arabic</option>
                </select>
              </Field>
              <Field label="Birthday">
                <BirthdayPicker value={f.birthday} onChange={(v) => setF({ ...f, birthday: v })} />
              </Field>
              {/* <Field label="How they found us">
                <select
                  value={f.source}
                  onChange={(e) => setF({ ...f, source: e.target.value })}
                  className={input}
                >
                  {FOUND.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field> */}
            </div>
            {/* <div className="text-[12px] text-muted-foreground">They agree to receive offers by</div>
            <div className="flex flex-wrap gap-[18px] text-[13px]">
              {(
                [
                  ["me", "Email"],
                  ["ms", "SMS"],
                  ["mw", "WhatsApp"],
                ] as const
              ).map(([k, l]) => (
                <label key={k} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="accent-[#0a0a0a]"
                    checked={f[k]}
                    onChange={(e) => setF({ ...f, [k]: e.target.checked })}
                  />{" "}
                  {l}
                </label>
              ))}
            </div>
            <p className="text-[11.5px] text-muted-foreground">
              Only people who agreed receive bulk messages. Order and delivery updates are always
              sent.
            </p> */}
            <Field label="Private notes (team only)">
              <textarea
                value={f.notes}
                onChange={(e) => setF({ ...f, notes: e.target.value })}
                rows={2}
                placeholder="e.g. Prefers delivery after 6 pm"
                className={cn(input, "h-auto py-2")}
              />
            </Field>
            <DialogFooter className="items-center">
              {err && <span className="mr-auto text-[12.5px] text-bad">{err}</span>}
              <Button onClick={close}>Cancel</Button>
              <Primary onClick={save}>{open.customer ? "Save changes" : "Save customer"}</Primary>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
  return { send, exportTo, form, dialog };
}
const Section = ({ children }: { children: ReactNode }) => (
  <div className="border-b border-line-soft pb-2 text-[10.5px] uppercase tracking-[.16em] text-muted-foreground">
    {children}
  </div>
);
export const CITIES = [
  "New Cairo",
  "Heliopolis",
  "Nasr City",
  "Zamalek",
  "Maadi",
  "Mohandessin",
  "Sheikh Zayed",
  "6th of October",
  "Giza",
  "Alexandria",
  "North Coast",
  "Hurghada",
  "Other",
];
const FOUND = [
  "Walk-in / office",
  "Phone call",
  "WhatsApp",
  "Instagram",
  "Facebook",
  "Referral",
  "Event",
  "Website",
  "Other",
];

/** Birthday is picked, never typed. Always shown (and stored) as day-month-year, e.g. 02 Jun 1990. */
const BDAY = /^(d{1,2}) ([A-Za-z]{3,9}) (d{4})$/;
const fmtBirthday = (d: Date) =>
  `${String(d.getDate()).padStart(2, "0")} ${d.toLocaleDateString("en-GB", { month: "short" })} ${d.getFullYear()}`;
function BirthdayPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const m = BDAY.exec(value);
  const parsed = m ? new Date(`${m[1]} ${m[2]} ${m[3]}`) : undefined;
  const sel = parsed && !isNaN(parsed.getTime()) ? parsed : undefined;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={cn(input, "text-left", !value && "text-muted-foreground")}>
          {value || "Pick a date"}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          startMonth={new Date(1930, 0)}
          endMonth={new Date()}
          {...(sel ? { selected: sel, defaultMonth: sel } : { defaultMonth: new Date(1990, 0) })}
          disabled={{ after: new Date() }}
          onSelect={(d) => {
            if (d) onChange(fmtBirthday(d));
            setOpen(false);
          }}
        />
        {value && (
          <div className="border-t border-border p-2 text-right">
            <button
              type="button"
              className="text-[12.5px] underline"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              Clear
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
