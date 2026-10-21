import { Link } from "@tanstack/react-router";
import { useReducer, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Toggle } from "@/components/admin/primitives";
import { Button, Card, PageHeader } from "@/components/admin/page";
import { DateField } from "@/components/admin/DateField";
import { EmailListEditor } from "@/components/admin/EmailListEditor";
import { SearchSelect } from "@/components/admin/SearchSelect";
import { BiField, Fld, TouchCtx, TxtField, useDone } from "@/components/admin/SiteContentUi";
import { TemplatesTab } from "@/components/admin/TemplatesTab";
import { useVerify } from "@/components/admin/VerifyDialog";
import {
  SET,
  bumpSettings,
  useSettingsStore,
  type Connection,
  type CustomerEmail,
  type PayMethod,
  type StoreMode,
} from "@/components/admin/SettingsFlow";
import { alertNote } from "@/pages/ScriptsPage";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const inputCls =
  "h-9 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-[14px] outline-none focus:border-primary [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none";
const areaCls =
  "w-full min-w-0 resize-y rounded-lg border border-border bg-surface px-3 py-2.5 text-[14px] leading-normal outline-none focus:border-primary";
const redBtn = "h-9 rounded-lg bg-bad px-4 text-[13.5px] text-white";

const TABS = [
  "Store",
  "Checkout",
  "Payments",
  "Notifications",
  "Message templates",
  "Connections",
] as const;
type Tab = (typeof TABS)[number];

function Row({
  label,
  hint,
  on,
  onChange,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  on: boolean;
  onChange: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="border-b border-line-soft py-3 last:border-b-0">
      <div className="flex items-center justify-between gap-3.5">
        <div>
          <div className="text-[13.5px]">{label}</div>
          {hint && <div className="mt-0.5 text-[12px] text-muted-foreground">{hint}</div>}
        </div>
        <Toggle on={on} onChange={onChange} label={String(label)} />
      </div>
      {children && (
        <div className={cn("mt-3", !on && "pointer-events-none opacity-50")}>{children}</div>
      )}
    </div>
  );
}

const STATUS_PILL: Record<StoreMode, [string, string]> = {
  open: ["Open", "bg-good-bg text-good"],
  pause: ["Orders paused", "bg-warn-bg text-warn"],
  maint: ["Under maintenance", "bg-muted text-muted-foreground"],
};
const shortDate = (iso: string) => {
  if (!iso) return "…";
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m! - 1]} ${y}`;
};

export default function SettingsPage({
  initialTab,
  from,
}: {
  initialTab?: Tab | undefined;
  /** Customer id (or "customers") the person came from via "Manage templates". */
  from?: string | undefined;
}) {
  useSettingsStore();
  const [doneNode, done] = useDone();
  const [verifyNode, verify] = useVerify(done);
  const [tab, setTab] = useState<Tab>(initialTab ?? "Store");
  const [dirty, setDirty] = useState(false);
  const [leaveTo, setLeaveTo] = useState<Tab | null>(null);
  const touch = () => {
    setDirty(true);
    bumpSettings();
  };

  const [modeAsk, setModeAsk] = useState<StoreMode | null>(null);
  const [payAsk, setPayAsk] = useState<PayMethod | null>(null);
  const [payEdit, setPayEdit] = useState<{ m: PayMethod; vals: Record<string, string> } | null>(
    null,
  );
  const [mailEdit, setMailEdit] = useState<{ i: number; draft: CustomerEmail } | null>(null);
  const [conEdit, setConEdit] = useState<{
    c: Connection;
    provider: string;
    vals: Record<string, string>;
  } | null>(null);
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const mailRefs = [useRef<HTMLTextAreaElement>(null), useRef<HTMLTextAreaElement>(null)];
  const [mailLang, setMailLang] = useState<0 | 1>(0);

  const { store, status, checkout, payments, alerts, emails, connections } = SET;
  const guard = (title: string, why: string, who: "owner" | "self", onOk: () => void) =>
    verify({ title, why, who, onOk });

  const goTab = (t: Tab) => {
    if (t === tab) return;
    if (dirty) setLeaveTo(t);
    else setTab(t);
  };
  const save = () => {
    if (alerts.some((a) => a.on && !a.to.length)) {
      setTab("Notifications");
      return void toast("Add at least one email to every alert that is switched on");
    }
    setDirty(false);
    done("Settings saved", "Your changes are live.");
  };

  /* ---------- store status ---------- */
  const pickMode = (m: StoreMode) => {
    if (m === status.mode) return;
    guard(
      "Owner only",
      "Changing the store status needs the owner's email, mobile number and a code sent to the owner's email and WhatsApp.",
      "owner",
      () => {
        if (m === "open") {
          status.mode = "open";
          bumpSettings();
          done(
            "Store open",
            'Customers can buy again. Everyone who pressed "Notify me" gets an email and WhatsApp.',
            alertNote(),
          );
        } else setModeAsk(m);
      },
    );
  };

  /* ---------- payments ---------- */
  const switchPay = (m: PayMethod) =>
    guard(
      "Protected action",
      "Payment methods are protected. Confirm it's you with your email, mobile number and a code sent to your email and WhatsApp.",
      "self",
      () => {
        if (!m.on && m.fields && !m.connected) {
          toast(`Set up ${m.name} first`);
          setPayEdit({ m, vals: { ...m.fields } });
          return;
        }
        setPayAsk(m);
      },
    );
  const editPay = (m: PayMethod) =>
    guard(
      "Protected action",
      "Payment details are protected. Confirm it's you with your email, mobile number and a code sent to your email and WhatsApp.",
      "self",
      () => {
        setTestMsg(null);
        setPayEdit({ m, vals: { ...m.fields! } });
      },
    );

  /* ---------- connections ---------- */
  const openConnection = (c: Connection) =>
    guard(
      "Protected action",
      "Connections are protected. Confirm it's you with your email, mobile number and a code sent to your email and WhatsApp.",
      "self",
      () => {
        setTestMsg(null);
        setConEdit({ c, provider: c.provider, vals: { ...c.values } });
      },
    );
  const conProvider = conEdit?.c.providers.find((p) => p.key === conEdit.provider);
  const conFilled = !!conProvider && conProvider.fields.every((f) => conEdit?.vals[f]?.trim());

  /* ---------- customer emails ---------- */
  const insertMail = (field: string) => {
    if (!mailEdit) return;
    const el = mailRefs[mailLang]!.current;
    const tag = `{${field}}`;
    const body = mailEdit.draft.body;
    const cur = body[mailLang];
    const a = el?.selectionStart ?? cur.length;
    const b = el?.selectionEnd ?? a;
    body[mailLang] = cur.slice(0, a) + tag + cur.slice(b);
    refresh();
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(a + tag.length, a + tag.length);
    });
  };

  return (
    <TouchCtx.Provider value={touch}>
      {from && (
        <div className="mb-2 text-[12px]">
          {from === "customers" ? (
            <Link
              to="/$section"
              params={{ section: "customers" }}
              className="underline underline-offset-[3px]"
            >
              ← Back to Customers
            </Link>
          ) : (
            <Link
              to="/customers/$customerId"
              params={{ customerId: from }}
              className="underline underline-offset-[3px]"
            >
              ← Back to customer
            </Link>
          )}
        </div>
      )}
      <PageHeader
        title="Settings"
        subtitle="The store's basic rules — set once, changed rarely. Owner only."
        actions={
          <>
            {dirty && <span className="self-center text-[12.5px] text-warn">Unsaved changes</span>}
            <Button primary onClick={save}>
              Save
            </Button>
          </>
        }
      />
      <div className="mb-[18px] flex gap-1 overflow-x-auto overflow-y-hidden border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => goTab(t)}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[13px]",
              t === tab
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Store" && (
        <>
          <Card>
            <h3 className="mb-1 text-[15px]">Store details</h3>
            <p className="mb-3 text-[12px] text-muted-foreground">
              Typed once here. The website footer, invoices and emails take them from here
              automatically.
            </p>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Fld label="Store name">
                <TxtField o={store} k="name" />
              </Fld>
              <Fld label="Legal name">
                <TxtField o={store} k="legal" />
              </Fld>
            </div>
            <Fld label="Legal name (Arabic)" className="mt-3.5">
              <input
                dir="rtl"
                value={store.legalAr}
                onChange={(e) => {
                  store.legalAr = e.target.value;
                  touch();
                }}
                className={cn(inputCls, "text-right")}
              />
            </Fld>
            <div className="mt-3.5 grid gap-3.5 sm:grid-cols-2">
              <Fld label="Address">
                <TxtField o={store} k="address" />
              </Fld>
              <Fld label="Address (Arabic)">
                <input
                  dir="rtl"
                  value={store.addressAr}
                  onChange={(e) => {
                    store.addressAr = e.target.value;
                    touch();
                  }}
                  className={cn(inputCls, "text-right")}
                />
              </Fld>
            </div>
            <div className="mt-3.5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              <Fld label="Phone">
                <TxtField o={store} k="phone" />
              </Fld>
              <Fld label="Email">
                <TxtField o={store} k="email" />
              </Fld>
              <Fld label="Tax registration no.">
                <TxtField o={store} k="tax" />
              </Fld>
              <Fld label="Commercial register no.">
                <TxtField o={store} k="cr" />
              </Fld>
            </div>
            <p className="mt-2 text-[12px] text-muted-foreground">
              The tax and commercial register numbers appear on invoices.
            </p>
          </Card>
          <Card>
            <h3 className="mb-3 text-[15px]">Regional</h3>
            <div className="grid gap-3.5 sm:grid-cols-3">
              <Fld label="Currency">
                <SearchSelect
                  value={store.currency}
                  items={[{ value: "EGP", label: "EGP — Egyptian pound" }]}
                  onChange={(v) => {
                    store.currency = v || "EGP";
                    touch();
                  }}
                  searchable={false}
                  className="text-[14px]"
                />
              </Fld>
              <Fld label="Price format">
                <SearchSelect
                  value={store.priceFormat}
                  items={[
                    { value: "a", label: "7,850 EGP" },
                    { value: "b", label: "EGP 7,850" },
                  ]}
                  onChange={(v) => {
                    store.priceFormat = v === "b" ? "b" : "a";
                    touch();
                  }}
                  searchable={false}
                  className="text-[14px]"
                />
              </Fld>
              <Fld label="Time zone">
                <SearchSelect
                  value={store.tz}
                  items={[
                    { value: "Africa/Cairo", label: "Africa/Cairo (GMT+2 / +3)" },
                    { value: "Asia/Dubai", label: "Asia/Dubai (GMT+4)" },
                    { value: "Asia/Riyadh", label: "Asia/Riyadh (GMT+3)" },
                    { value: "Europe/London", label: "Europe/London (GMT+0 / +1)" },
                  ]}
                  onChange={(v) => {
                    store.tz = v || store.tz;
                    touch();
                  }}
                  searchable={false}
                  className="text-[14px]"
                />
              </Fld>
            </div>
            <Row
              label="Prices include VAT"
              hint="Prices on the site already include VAT; invoices show the VAT part"
              on={store.vatIncluded}
              onChange={() => {
                store.vatIncluded = !store.vatIncluded;
                touch();
              }}
            >
              <Fld label="VAT rate (%)" className="max-w-[140px]">
                <input
                  type="number"
                  value={store.vatRate}
                  onChange={(e) => {
                    store.vatRate = e.target.value;
                    touch();
                  }}
                  className={inputCls}
                />
              </Fld>
            </Row>
          </Card>
          <Card>
            <h3 className="mb-1 flex items-center justify-between text-[15px]">
              Store status
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 font-sans text-[12.5px]",
                  STATUS_PILL[status.mode][1],
                )}
              >
                ● {STATUS_PILL[status.mode][0]}
              </span>
            </h3>
            <p className="mb-3.5 text-[12.5px] text-muted-foreground">
              Close the shop for a while — a holiday, a stock count, or technical work.{" "}
              <b className="font-medium text-foreground">Owner only</b> — can't be given to anyone
              else. Each change asks for your email, mobile number and a code sent to your email and
              WhatsApp. You can still see and test the site while it is closed.
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              {(
                [
                  ["open", "Open", "Customers browse and buy as normal."],
                  [
                    "pause",
                    "Pause orders — recommended",
                    'Customers can still browse and save their wishlist. A banner shows on every page from the first second, and "Add to bag" becomes "Notify me when we\'re back". Nobody finds out at checkout.',
                  ],
                  [
                    "maint",
                    "Under maintenance",
                    "The whole site shows only a message page. For a few hours of technical work only — customers leave, and Google may drop pages if it stays closed for days.",
                  ],
                ] as [StoreMode, string, string][]
              ).map(([k, a, b]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => pickMode(k)}
                  className={cn(
                    "rounded-[10px] border bg-surface p-3.5 text-left",
                    status.mode === k ? "border-2 border-primary p-[13px]" : "border-border",
                  )}
                >
                  <b className="block text-[14px] font-medium">{a}</b>
                  <span className="mt-1.5 block text-[12.5px] leading-relaxed text-muted-foreground">
                    {b}
                  </span>
                </button>
              ))}
            </div>
            {status.mode === "pause" && (
              <>
                <Fld label="Back on (shows as {date})" className="mt-4 max-w-[260px]">
                  <DateField
                    value={status.back}
                    onChange={(v) => {
                      status.back = v;
                      touch();
                    }}
                  />
                </Fld>
                <div className="mt-4">
                  <BiField label="Banner message" labelAr="رسالة الشريط" v={status.msg} rows={2} />
                </div>
                <div className="text-[12px] text-muted-foreground">Preview on the site</div>
                <div className="mt-1.5 rounded-t-lg bg-primary px-3 py-2.5 text-center text-[12.5px] text-primary-foreground">
                  {status.msg[0].replace("{date}", shortDate(status.back))}
                </div>
                <div className="flex items-center gap-3.5 rounded-b-lg border border-t-0 border-border bg-surface p-3.5">
                  <i className="size-14 rounded-lg bg-[linear-gradient(160deg,#C5A06A,#86642E)]" />
                  <div>
                    <b className="block text-[13.5px] font-medium">Good Girl Eau de Parfum 80ml</b>
                    <small className="text-[12px] text-muted-foreground">6,450 EGP</small>
                    <span className="mt-1.5 block w-fit border border-primary px-3 py-1.5 text-[11.5px] tracking-[.08em]">
                      Notify me when we're back
                    </span>
                  </div>
                </div>
              </>
            )}
            {status.mode === "maint" && (
              <div className="mt-4">
                <BiField
                  label="Message on the page"
                  labelAr="الرسالة على الصفحة"
                  v={status.maintMsg}
                  rows={2}
                />
              </div>
            )}
          </Card>
        </>
      )}

      {tab === "Checkout" && (
        <Card>
          <h3 className="mb-1 text-[15px]">Checkout</h3>
          {(
            [
              ["guest", "Guest checkout", "Customers can buy without an account"],
              ["gift", "Gift options at checkout", "Gift wrapping and a handwritten message card"],
              ["notes", "Order notes", "A box for the customer to add a note to the order"],
              [
                "otp",
                "Require phone verification (OTP) for COD",
                "A code is sent by SMS before a cash on delivery order is placed",
              ],
            ] as const
          ).map(([k, label, hint]) => (
            <Row
              key={k}
              label={label}
              hint={hint}
              on={!!checkout[k]}
              onChange={() => {
                checkout[k] = !checkout[k];
                touch();
              }}
            />
          ))}
          <div className="flex items-center justify-between gap-3.5 border-t border-line-soft py-3">
            <div>
              <div className="text-[13.5px]">Maximum cash on delivery order</div>
              <div className="mt-0.5 text-[12px] text-muted-foreground">
                Set in one place only: Delivery › Delivery options
              </div>
            </div>
            <Link to="/delivery" className="text-[13px] underline underline-offset-[3px]">
              Set in Delivery →
            </Link>
          </div>
        </Card>
      )}

      {tab === "Payments" && (
        <Card>
          <h3 className="mb-1 text-[15px]">Payments</h3>
          <p className="mb-3 text-[12.5px] text-muted-foreground">
            Protected. Switching a payment method on or off, or changing its details, asks for the
            email, mobile number and a code (sent to email and WhatsApp) of the person allowed (the
            owner, or someone given "Payments & connections" in Team & permissions), and sends you
            an alert.
          </p>
          {payments.map((p) => (
            <div
              key={p.key}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-[18px] border-t border-line-soft py-4 first:border-0"
            >
              <div>
                <b className="text-[14.5px] font-medium">{p.name}</b>
                <small className="mt-0.5 block text-[12.5px] text-muted-foreground">{p.desc}</small>
                {p.fields && (
                  <small className="mt-0.5 block text-[12.5px]">
                    {p.connected ? (
                      <span className="text-good">● Connected</span>
                    ) : (
                      <span className="text-warn">○ Not set up yet</span>
                    )}
                  </small>
                )}
              </div>
              {p.fields ? (
                <Button onClick={() => editPay(p)}>
                  {p.connected ? "Edit settings" : "Set up"}
                </Button>
              ) : (
                <span />
              )}
              <Toggle on={p.on} onChange={() => switchPay(p)} label={p.name} />
            </div>
          ))}
        </Card>
      )}

      {tab === "Notifications" && (
        <>
          <Card>
            <h3 className="mb-1 text-[15px]">Alerts to the team</h3>
            <p className="mb-1 text-[12.5px] text-muted-foreground">
              Each alert goes to the email addresses you list — add as many as you need, including
              shared mailboxes.
            </p>
            {alerts.map((a) => (
              <Row
                key={a.name}
                label={a.name}
                hint={a.desc}
                on={a.on}
                onChange={() => {
                  a.on = !a.on;
                  touch();
                }}
              >
                <EmailListEditor
                  value={a.to}
                  onChange={(to) => {
                    a.to = to;
                    touch();
                  }}
                />
              </Row>
            ))}
          </Card>
          <Card>
            <h3 className="mb-1 text-[15px]">Emails to customers</h3>
            <p className="mb-2 text-[12.5px] text-muted-foreground">
              Sent automatically. Switch each one on or off and edit its wording in English and
              Arabic. Customers get the language they shop in. They use the store details from the
              Store tab.
            </p>
            {emails.map((c, i) => (
              <div
                key={c.name}
                className="flex items-center justify-between gap-4 border-t border-line-soft py-3 first:border-0"
              >
                <div>
                  <div className="text-[13.5px]">{c.name}</div>
                  <div className="mt-0.5 text-[12px] text-muted-foreground">
                    {c.when} · "{c.subject[0]}"
                  </div>
                </div>
                <div className="flex items-center gap-3.5">
                  <button
                    type="button"
                    className="text-[13px] underline underline-offset-[3px]"
                    onClick={() => {
                      setTestMsg(null);
                      setMailEdit({ i, draft: structuredClone(c) });
                    }}
                  >
                    Edit
                  </button>
                  <Toggle
                    on={c.on}
                    onChange={() => {
                      c.on = !c.on;
                      touch();
                    }}
                    label={c.name}
                  />
                </div>
              </div>
            ))}
          </Card>
        </>
      )}

      {tab === "Message templates" && <TemplatesTab done={done} />}

      {tab === "Connections" && (
        <Card>
          <h3 className="mb-1 text-[15px]">Connections</h3>
          <p className="mb-4 text-[12.5px] text-muted-foreground">
            The service accounts that actually deliver messages. Message templates and Notifications
            hold the wording; these send it. Choose your provider and enter the details it gives you
            — no developer needed. Protected: each change asks for the email, mobile number and a
            code (sent to email and WhatsApp) of the person allowed (the owner, or someone given
            "Payments & connections" in Team & permissions), and sends you an alert.
          </p>
          {connections.map((c) => (
            <div
              key={c.key}
              className="grid grid-cols-[1fr_auto] items-center gap-[18px] border-t border-line-soft py-4 first:border-0"
            >
              <div>
                <b className="text-[14.5px] font-medium">{c.name}</b>
                <small className="mt-0.5 block text-[12.5px] text-muted-foreground">{c.desc}</small>
                <small className="mt-0.5 block text-[12.5px] text-muted-foreground">
                  Used by: {c.usedBy}
                </small>
                <small className="mt-0.5 block text-[12.5px]">
                  {c.connected ? (
                    <span className="text-good">
                      ● Connected · {c.providers.find((p) => p.key === c.provider)?.name}
                    </span>
                  ) : (
                    <span className="text-warn">
                      ○ Not connected yet — nothing is sent until it is
                    </span>
                  )}
                </small>
              </div>
              <Button onClick={() => openConnection(c)}>
                {c.connected ? "Edit settings" : "Connect"}
              </Button>
            </div>
          ))}
        </Card>
      )}

      {/* ---- dialogs ---- */}
      <Dialog open={!!modeAsk} onOpenChange={(o) => !o && setModeAsk(null)}>
        <DialogContent className="max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="font-head text-[18px] font-normal">
              {modeAsk === "pause" ? "Pause orders?" : "Put the site under maintenance?"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-[13.5px]">
            {modeAsk === "pause"
              ? 'From now on customers can browse but not buy. The banner shows on every page and "Add to bag" becomes "Notify me when we\'re back".'
              : "The whole site shows only the maintenance message. Use it for a few hours only."}
          </p>
          <DialogFooter>
            <Button onClick={() => setModeAsk(null)}>Cancel</Button>
            <button
              type="button"
              className={redBtn}
              onClick={() => {
                if (!modeAsk) return;
                status.mode = modeAsk;
                const m = modeAsk;
                setModeAsk(null);
                bumpSettings();
                done(
                  m === "pause" ? "Orders paused" : "Site under maintenance",
                  "Switch back to Open any time.",
                  alertNote(),
                );
              }}
            >
              {modeAsk === "pause" ? "Pause orders" : "Close the site"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!payAsk} onOpenChange={(o) => !o && setPayAsk(null)}>
        <DialogContent className="max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="font-head text-[18px] font-normal">
              {payAsk?.on ? "Switch off" : "Switch on"} {payAsk?.name}?
            </DialogTitle>
          </DialogHeader>
          <p className="text-[13.5px]">
            {payAsk?.on
              ? `Customers can no longer pay with ${payAsk.name} — straight away.${payAsk.key === "paymob" ? " Card and wallet payments stop." : ""}`
              : `Customers can pay with ${payAsk?.name} from now on.`}
          </p>
          <DialogFooter>
            <Button onClick={() => setPayAsk(null)}>Cancel</Button>
            {payAsk?.on ? (
              <button
                type="button"
                className={redBtn}
                onClick={() => {
                  const p = payAsk;
                  p.on = false;
                  setPayAsk(null);
                  bumpSettings();
                  done(
                    `${p.name} switched off`,
                    "Customers can't pay with it any more.",
                    alertNote(),
                  );
                }}
              >
                Switch off
              </button>
            ) : (
              <Button
                primary
                onClick={() => {
                  if (!payAsk) return;
                  const p = payAsk;
                  p.on = true;
                  setPayAsk(null);
                  bumpSettings();
                  done(`${p.name} switched on`, "Customers can pay with it now.", alertNote());
                }}
              >
                Switch on
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!payEdit} onOpenChange={(o) => !o && setPayEdit(null)}>
        <DialogContent className="max-w-[620px]">
          <DialogHeader>
            <DialogTitle className="font-head text-[18px] font-normal">
              {payEdit?.m.name} settings
            </DialogTitle>
          </DialogHeader>
          {payEdit && (
            <>
              <p className="text-[13.5px]">
                {payEdit.m.key === "bank"
                  ? "These details are shown to the customer to make the transfer."
                  : `From your ${payEdit.m.name} business account.`}
              </p>
              <div className="grid gap-3.5 sm:grid-cols-2">
                {Object.keys(payEdit.vals).map((k) => (
                  <Fld key={k} label={k}>
                    <input
                      type={/key|secret/i.test(k) ? "password" : "text"}
                      value={payEdit.vals[k]}
                      onChange={(e) => {
                        setPayEdit({ ...payEdit, vals: { ...payEdit.vals, [k]: e.target.value } });
                        setTestMsg(null);
                      }}
                      className={inputCls}
                    />
                  </Fld>
                ))}
              </div>
              {testMsg && (
                <p className={cn("text-[13px]", testMsg.ok ? "text-good" : "text-warn")}>
                  {testMsg.text}
                </p>
              )}
              <DialogFooter className="sm:justify-between">
                {payEdit.m.key === "bank" ? (
                  <span />
                ) : (
                  <Button
                    onClick={() =>
                      setTestMsg(
                        Object.values(payEdit.vals).every(Boolean)
                          ? { ok: true, text: `Connection works — ${payEdit.m.name} answered.` }
                          : { ok: false, text: "Fill in all the details first." },
                      )
                    }
                  >
                    Test connection
                  </Button>
                )}
                <span className="flex gap-2">
                  <Button onClick={() => setPayEdit(null)}>Cancel</Button>
                  <Button
                    primary
                    onClick={() => {
                      if (!Object.values(payEdit.vals).every(Boolean))
                        return void toast("Fill in all the details first");
                      payEdit.m.fields = payEdit.vals;
                      payEdit.m.connected = true;
                      const n = payEdit.m.name;
                      setPayEdit(null);
                      bumpSettings();
                      done(`${n} saved`, "Your payment details are saved.", alertNote());
                    }}
                  >
                    Save
                  </Button>
                </span>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {mailEdit && (
        <TouchCtx.Provider value={refresh}>
          <Dialog open onOpenChange={(o) => !o && setMailEdit(null)}>
            <DialogContent className="max-h-[90vh] max-w-[900px] overflow-auto">
              <DialogHeader>
                <DialogTitle className="font-head text-[18px] font-normal">
                  Edit email · {mailEdit.draft.name}
                </DialogTitle>
              </DialogHeader>
              <p className="text-[13.5px]">{mailEdit.draft.when}.</p>
              <div className="grid gap-4 md:grid-cols-2">
                {([0, 1] as const).map((i) => (
                  <div key={i} className="flex flex-col gap-1.5 text-[12px] text-muted-foreground">
                    <span>{i ? "الموضوع" : "Subject"}</span>
                    <input
                      dir={i ? "rtl" : undefined}
                      value={mailEdit.draft.subject[i]}
                      onChange={(e) => {
                        mailEdit.draft.subject[i] = e.target.value;
                        refresh();
                      }}
                      className={cn(inputCls, i && "text-right")}
                    />
                    <span className="mt-1.5">{i ? "الرسالة" : "Message"}</span>
                    <textarea
                      ref={mailRefs[i]}
                      rows={5}
                      dir={i ? "rtl" : undefined}
                      value={mailEdit.draft.body[i]}
                      onFocus={() => setMailLang(i)}
                      onChange={(e) => {
                        mailEdit.draft.body[i] = e.target.value;
                        refresh();
                      }}
                      className={cn(areaCls, i && "text-right")}
                    />
                  </div>
                ))}
              </div>
              <div className="text-[12px] text-muted-foreground">
                Click to insert where the cursor is
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {["first_name", "order", "amount", "tracking_link", "reset_link"].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        insertMail(f);
                      }}
                      className="h-7 rounded-full border border-border bg-surface px-2.5 font-mono text-[12px] hover:border-primary"
                    >
                      {`{${f}}`}
                    </button>
                  ))}
                </div>
              </div>
              {testMsg && <p className="text-[13px] text-good">{testMsg.text}</p>}
              <DialogFooter>
                <Button
                  onClick={() =>
                    setTestMsg({ ok: true, text: "Test email sent to ramy.bakr@zelliny.com." })
                  }
                >
                  Send me a test
                </Button>
                <Button onClick={() => setMailEdit(null)}>Cancel</Button>
                <Button
                  primary
                  onClick={() => {
                    emails[mailEdit.i] = mailEdit.draft;
                    setMailEdit(null);
                    bumpSettings();
                    done("Email saved", "Customers get the new wording from now on.");
                  }}
                >
                  Save email
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TouchCtx.Provider>
      )}

      {conEdit && conProvider && (
        <Dialog open onOpenChange={(o) => !o && setConEdit(null)}>
          <DialogContent className="max-h-[90vh] max-w-[680px] overflow-auto">
            <DialogHeader>
              <DialogTitle className="font-head text-[18px] font-normal">
                {conEdit.c.connected ? `${conEdit.c.name} settings` : `Connect ${conEdit.c.name}`}
              </DialogTitle>
            </DialogHeader>
            <p className="text-[13.5px]">{conEdit.c.desc}.</p>
            <Fld label="Provider">
              <SearchSelect
                value={conEdit.provider}
                items={conEdit.c.providers.map((p) => ({ value: p.key, label: p.name }))}
                onChange={(v) => {
                  if (v) {
                    setConEdit({ ...conEdit, provider: v });
                    setTestMsg(null);
                  }
                }}
                searchable={false}
                className="text-[14px]"
              />
            </Fld>
            <div className="grid gap-3.5 sm:grid-cols-2">
              {conProvider.fields.map((f) => (
                <Fld key={f} label={f}>
                  <input
                    type={/token|key|secret|password|auth/i.test(f) ? "password" : "text"}
                    value={conEdit.vals[f] ?? ""}
                    onChange={(e) => {
                      setConEdit({ ...conEdit, vals: { ...conEdit.vals, [f]: e.target.value } });
                      setTestMsg(null);
                    }}
                    className={inputCls}
                  />
                </Fld>
              ))}
            </div>
            <p className="text-[12.5px] text-muted-foreground">
              The provider gives you these details when the account is opened.
            </p>
            {testMsg && (
              <p className={cn("text-[13px]", testMsg.ok ? "text-good" : "text-warn")}>
                {testMsg.text}
              </p>
            )}
            <DialogFooter className="sm:justify-between">
              <Button
                onClick={() =>
                  setTestMsg(
                    conFilled
                      ? {
                          ok: true,
                          text:
                            conEdit.c.key === "email"
                              ? "Test email sent to Ramy.Bakr@zelliny.com."
                              : "Test sent to +20 10 1717 1747.",
                        }
                      : { ok: false, text: "Fill in all the details first." },
                  )
                }
              >
                {conEdit.c.key === "email"
                  ? "Send test email"
                  : conEdit.c.key === "wa"
                    ? "Send test WhatsApp"
                    : "Send test SMS"}
              </Button>
              <span className="flex gap-2">
                <Button onClick={() => setConEdit(null)}>Cancel</Button>
                <Button
                  primary
                  onClick={() => {
                    if (!conFilled) return void toast("Fill in all the details first");
                    const c = conEdit.c;
                    const was = c.connected;
                    c.provider = conEdit.provider;
                    c.values = conEdit.vals;
                    c.connected = true;
                    setConEdit(null);
                    bumpSettings();
                    done(
                      was ? `${c.name} settings saved` : `${c.name} connected`,
                      `${c.name} messages now go out through ${conProvider.name}.`,
                      alertNote(),
                    );
                  }}
                >
                  {conEdit.c.connected ? "Save" : "Connect"}
                </Button>
              </span>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={!!leaveTo} onOpenChange={(o) => !o && setLeaveTo(null)}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-head text-[18px] font-normal">
              You have unsaved changes
            </DialogTitle>
          </DialogHeader>
          <p className="text-[13.5px]">Save them before leaving this tab?</p>
          <DialogFooter>
            <Button
              onClick={() => {
                setDirty(false);
                if (leaveTo) setTab(leaveTo);
                setLeaveTo(null);
              }}
            >
              Leave without saving
            </Button>
            <Button
              primary
              onClick={() => {
                const t = leaveTo;
                setLeaveTo(null);
                setDirty(false);
                if (t) setTab(t);
                done("Settings saved", "Your changes are live.");
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {verifyNode}
      {doneNode}
    </TouchCtx.Provider>
  );
}
