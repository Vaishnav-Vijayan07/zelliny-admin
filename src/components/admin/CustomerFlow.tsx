// Customers: local changes, Excel export, email / WhatsApp / SMS composers and the add-edit form.
// Shared by the Customers list and the single-customer page.
// Everything is local for now — swap addCustomer / editCustomer / sends for API calls.
import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { toast } from "sonner";
import type { CustomerAddress, CustomerRow, OrderEvent } from "@/lib/api/section-types";
import { cn } from "@/lib/utils";
import { useSessionUser } from "@/hooks/use-session";
import { Button } from "./page";
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

/* ---------- templates ---------- */
const EMAIL_TPL: Record<string, [string, string]> = {
  "Write my own": ["", ""],
  "New arrivals": [
    "New at Zelliny this week",
    "Dear {first name},\n\nA few new pieces have just arrived at Zelliny and we thought of you.\n\nDiscover them at zelliny.com.\n\nWarm regards,\nZelliny",
  ],
  "Private offer": [
    "A private offer for you",
    "Dear {first name},\n\nAs one of our valued clients, we would like to offer you a private privilege on your next order.\n\nReply to this email or visit zelliny.com.\n\nWarm regards,\nZelliny",
  ],
  "Thank you": [
    "Thank you from Zelliny",
    "Dear {first name},\n\nThank you for choosing Zelliny. We hope you are enjoying your piece.\n\nWarm regards,\nZelliny",
  ],
};
const WA_TPL: Record<string, string> = {
  "New arrivals":
    "Hello {first name}, new pieces have just arrived at Zelliny. See them at zelliny.com",
  "Private offer":
    "Hello {first name}, a private offer is waiting for you at Zelliny. Reply to this message to hear more.",
  "Order follow-up":
    "Hello {first name}, thank you for your order from Zelliny. Is everything as you expected?",
};
const fill = (t: string, c: CustomerRow) => t.replace(/\{first name\}/g, first(c.name));

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
  | { kind: "email" | "message" | "export"; list: LiveCustomer[]; scope?: string }
  | { kind: "form"; customer: LiveCustomer | null };

/**
 * `email(list)`, `message(list)`, `exportTo(list, scope)` and `form(customer | null)` open the dialogs.
 * Render `dialog` once on the page.
 */
export function useCustomerActions(all: LiveCustomer[], onSaved?: (id: string) => void) {
  const user = useSessionUser();
  const me = user?.name ?? "You";
  const [open, setOpen] = useState<Open | null>(null);
  const close = () => setOpen(null);

  /* email */
  const [tpl, setTpl] = useState("Write my own");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [test, setTest] = useState(false);
  /* message */
  const [via, setVia] = useState<"WhatsApp" | "SMS">("WhatsApp");
  const [waTpl, setWaTpl] = useState(Object.keys(WA_TPL)[0]!);
  const [sms, setSms] = useState(Object.values(WA_TPL)[0]!);
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

  const email = (list: LiveCustomer[]) => {
    setTpl("Write my own");
    setSubject("");
    setBody("");
    setTest(false);
    setErr("");
    setOpen({ kind: "email", list });
  };
  const message = (list: LiveCustomer[]) => {
    setVia("WhatsApp");
    setErr("");
    setOpen({ kind: "message", list });
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

  const sendEmail = () => {
    if (open?.kind !== "email") return;
    if (!subject.trim() || !body.trim()) {
      setErr("Add a subject and a message.");
      return;
    }
    const list = open.list.filter((c) => canReach(c, "Email"));
    list.forEach((c) =>
      recordMessage(c.id, {
        text: `Email · “${subject.trim()}”`,
        when: "Today, just now",
        who: me,
      }),
    );
    close();
    toast(
      `Email sent to ${plural(list.length, "customer")}${test ? " · test copy sent to you" : ""}`,
    );
  };
  const sendMessage = () => {
    if (open?.kind !== "message") return;
    if (via === "SMS" && !sms.trim()) {
      setErr("Write the SMS text.");
      return;
    }
    const list = open.list.filter((c) => canReach(c, via));
    list.forEach((c) =>
      recordMessage(c.id, {
        text:
          via === "WhatsApp"
            ? `WhatsApp · template “${waTpl}”`
            : `SMS · “${sms.slice(0, 60)}${sms.length > 60 ? "…" : ""}”`,
        when: "Today, just now",
        who: me,
      }),
    );
    close();
    toast(`${via} sent to ${plural(list.length, "customer")}`);
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
  const okN =
    open?.kind === "email"
      ? list.filter((c) => canReach(c, "Email")).length
      : open?.kind === "message"
        ? list.filter((c) => canReach(c, via)).length
        : 0;

  const dialog = (
    <Dialog open={!!open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-h-[88vh] max-w-[760px] overflow-y-auto">
        {open?.kind === "email" && (
          <>
            <Title>{one ? `Email ${one.name}` : `Email ${list.length} customers`}</Title>
            <Reach list={list} via="Email" />
            <div className="grid gap-3.5 md:grid-cols-2">
              <Field label="From">
                <select className={input}>
                  <option>Zelliny &lt;info@zelliny.com&gt;</option>
                  <option>{me}</option>
                </select>
              </Field>
              <Field label="Start from">
                <select
                  value={tpl}
                  className={input}
                  onChange={(e) => {
                    const t = EMAIL_TPL[e.target.value]!;
                    setTpl(e.target.value);
                    setSubject(t[0]);
                    setBody(t[1]);
                  }}
                >
                  {Object.keys(EMAIL_TPL).map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Subject">
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject line"
                className={input}
              />
            </Field>
            <Field
              label="Message"
              hint={
                <>
                  <b>{"{first name}"}</b> becomes each person's first name. Every bulk email carries
                  an unsubscribe link.
                </>
              }
            >
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={7}
                placeholder="Write your message"
                className={cn(input, "h-auto py-2")}
              />
            </Field>
            <label className="flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={test}
                onChange={(e) => setTest(e.target.checked)}
                className="accent-[#0a0a0a]"
              />{" "}
              Send me a test copy first
            </label>
            {err && <p className="text-[12.5px] text-bad">{err}</p>}
            <DialogFooter>
              <Button onClick={close}>Cancel</Button>
              <Primary disabled={!okN} onClick={sendEmail}>
                {okN ? `Send to ${okN}` : "Nobody to send to"}
              </Primary>
            </DialogFooter>
          </>
        )}

        {open?.kind === "message" && (
          <>
            <Title>{one ? `Message ${one.name}` : `Message ${list.length} customers`}</Title>
            <div className="flex gap-1.5">
              {(["WhatsApp", "SMS"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVia(v)}
                  className={cn(
                    "h-[34px] rounded-full border px-3.5 text-[12.5px]",
                    via === v
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-surface",
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
            <Reach list={list} via={via} />
            {via === "WhatsApp" ? (
              <>
                <Field
                  label="Message template"
                  hint="WhatsApp only allows messages from templates approved by Meta. They are set up once through the WhatsApp Business API, then chosen here."
                >
                  <select
                    value={waTpl}
                    onChange={(e) => setWaTpl(e.target.value)}
                    className={input}
                  >
                    {Object.keys(WA_TPL).map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </Field>
                <div className="rounded-lg bg-[#efe7dd] p-3.5">
                  <small className="mb-1.5 block text-[10.5px] uppercase tracking-[.1em] text-muted-foreground">
                    Preview{list[0] ? ` · ${list[0].name}` : ""}
                  </small>
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-lg bg-white px-3 py-2.5 text-[13px] leading-normal shadow-sm">
                    {list[0] ? fill(WA_TPL[waTpl]!, list[0]) : WA_TPL[waTpl]}
                  </div>
                </div>
                {one?.phone && (
                  <p className="text-[12px] text-muted-foreground">
                    For a personal one-to-one chat instead,{" "}
                    <a
                      href={`https://wa.me/${one.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      open WhatsApp with {first(one.name)}
                    </a>
                    .
                  </p>
                )}
              </>
            ) : (
              <Field
                label="SMS text"
                hint={
                  <>
                    Sent from the sender name <b>ZELLINY</b>. {"{first name}"} becomes each person's
                    first name. {sms.length}/160
                  </>
                }
              >
                <textarea
                  value={sms}
                  onChange={(e) => setSms(e.target.value.slice(0, 160))}
                  rows={3}
                  className={cn(input, "h-auto py-2")}
                />
              </Field>
            )}
            {err && <p className="text-[12.5px] text-bad">{err}</p>}
            <DialogFooter>
              <Button onClick={close}>Cancel</Button>
              <Primary disabled={!okN} onClick={sendMessage}>
                {okN ? `Send ${via} to ${okN}` : "Nobody to send to"}
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
              {/* <Field label="Language for messages">
                <select
                  value={f.language}
                  onChange={(e) => setF({ ...f, language: e.target.value })}
                  className={input}
                >
                  <option>English</option>
                  <option>Arabic</option>
                </select>
              </Field> */}
              <Field label="Birthday">
                <input
                  value={f.birthday}
                  onChange={(e) => setF({ ...f, birthday: e.target.value })}
                  placeholder="e.g. 14 March"
                  className={input}
                />
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
  return { email, message, exportTo, form, dialog };
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
