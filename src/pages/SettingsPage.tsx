import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Toggle } from "@/components/admin/primitives";
import { Button, Card, PageHeader } from "@/components/admin/page";
import { EmailListEditor } from "@/components/admin/EmailListEditor";

const inputCls =
  "h-9 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-[14px] outline-none focus:border-primary";
const areaCls =
  "w-full min-w-0 resize-y rounded-lg border border-border bg-surface px-3 py-2.5 text-[14px] leading-normal outline-none focus:border-primary";

function Field({
  label,
  hint,
  children,
}: {
  label: ReactNode;
  hint?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className="mb-3.5 flex min-w-0 flex-col gap-1.5">
      <label className="text-[12px] text-muted-foreground">{label}</label>
      {children}
      {hint && <div className="text-[12px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
function Row({
  label,
  hint,
  on,
  onChange,
  children,
}: {
  label: string;
  hint?: string;
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
        <Toggle on={on} onChange={onChange} label={label} />
      </div>
      {children && (
        <div className={cn("mt-3", !on && "pointer-events-none opacity-50")}>{children}</div>
      )}
    </div>
  );
}
const tag = (t: string, dark: boolean) => (
  <span
    className={cn(
      "rounded-[3px] px-1.5 py-px text-[10px] font-semibold tracking-[.08em]",
      dark ? "bg-primary text-primary-foreground" : "bg-[#f0f0f0] text-foreground",
    )}
  >
    {t}
  </span>
);
function Bi({
  label,
  en,
  ar,
  onEn,
  onAr,
  rows,
}: {
  label: string;
  en: string;
  ar: string;
  onEn: (v: string) => void;
  onAr: (v: string) => void;
  rows: number;
}) {
  return (
    <div className="mb-1.5">
      <div className="mb-2 text-[13px] font-medium">{label}</div>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label={<>{tag("EN", true)} English</>}>
          <textarea
            rows={rows}
            value={en}
            onChange={(e) => onEn(e.target.value)}
            className={areaCls}
          />
        </Field>
        <Field label={<>{tag("AR", false)} العربية</>}>
          <textarea
            rows={rows}
            dir="rtl"
            value={ar}
            onChange={(e) => onAr(e.target.value)}
            className={cn(areaCls, "text-right")}
          />
        </Field>
      </div>
    </div>
  );
}

const TABS = ["Store", "Checkout", "Notifications", "Policies"] as const;
type Tab = (typeof TABS)[number];
const MESSAGES: [string, boolean, boolean, boolean][] = [
  ["Order confirmation", true, true, false],
  ["Shipped + tracking", true, true, false],
  ["Out for delivery", true, true, true],
  ["Delivered", true, true, false],
  ["Return approved", true, false, false],
  ["Refund issued", true, false, false],
  ["Enquiry received", true, false, true],
  ["Abandoned bag reminder", true, false, false],
  ["Back in stock", true, false, false],
];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("Store");
  const [s, setS] = useState({
    name: "Zelliny",
    legal: "ZELLINY FOR GIFTS AND LUXURY PRODUCTS",
    legalAr: "زيليني للهدايا والمنتجات الفاخرة",
    address: "12 Dr. Zakaria El Bardisi St., Office 3, El Nozha El Gedida, Cairo, Egypt",
    phone: "+2 010 3848 4841",
    email: "info@zelliny.com",
    tax: "",
    currency: "EGP",
    tz: "Africa/Cairo",
    rtl: true,
    vat: true,
  });
  const [c, setC] = useState({ guest: true, gift: true, notes: true, otp: true, maxCod: "15,000" });
  const [alerts, setAlerts] = useState({
    order: { on: true, to: ["orders@zelliny.com", "ramy.bakr@zelliny.com"] },
    enquiry: { on: true, to: ["ramy.bakr@zelliny.com", "zain@zelliny.com"] },
    ret: { on: true, to: ["returns@zelliny.com"] },
  });
  const [msgs, setMsgs] = useState(MESSAGES);
  const [pol, setPol] = useState({
    ret: "Fragrance and beauty returnable within 14 days, unopened and sealed…",
    retAr: "يمكن إرجاع العطور ومستحضرات التجميل خلال ١٤ يومًا…",
    del: "Orders are delivered by courier within the times shown for your area…",
    delAr: "يتم توصيل الطلبات بواسطة شركة الشحن خلال المدة الموضحة لمنطقتك…",
  });

  const setAlert = (k: keyof typeof alerts, patch: Partial<(typeof alerts)["order"]>) =>
    setAlerts((a) => ({ ...a, [k]: { ...a[k], ...patch } }));
  const flip = (i: number, col: 1 | 2 | 3) =>
    setMsgs((m) =>
      m.map((r, k) => (k === i ? (r.map((v, j) => (j === col ? !v : v)) as typeof r) : r)),
    );
  const save = () => {
    const empty = (Object.values(alerts) as { on: boolean; to: string[] }[]).some(
      (a) => a.on && !a.to.length,
    );
    if (empty) {
      setTab("Notifications");
      toast("Add at least one email to every alert that is switched on");
      return;
    }
    toast("Settings saved");
  };

  const alertRows: [keyof typeof alerts, string, string][] = [
    ["order", "New order", "Emailed to everyone below the moment an order is placed"],
    ["enquiry", "New corporate enquiry", "Emailed as soon as a corporate enquiry arrives"],
    ["ret", "Return requested", "Emailed when a customer asks to return something"],
  ];

  return (
    <>
      <PageHeader
        title="Settings"
        actions={
          <Button primary onClick={save}>
            Save
          </Button>
        }
      />
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
            {t}
          </button>
        ))}
      </div>

      {tab === "Store" && (
        <>
          <Card>
            <h3 className="mb-3 text-[15px]">Store details</h3>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field label="Store name">
                <input
                  value={s.name}
                  onChange={(e) => setS({ ...s, name: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Legal name">
                <input
                  value={s.legal}
                  onChange={(e) => setS({ ...s, legal: e.target.value })}
                  className={inputCls}
                />
              </Field>
            </div>
            <Field label="Legal name (Arabic)">
              <input
                dir="rtl"
                value={s.legalAr}
                onChange={(e) => setS({ ...s, legalAr: e.target.value })}
                className={cn(inputCls, "text-right")}
              />
            </Field>
            <Field label="Address">
              <input
                value={s.address}
                onChange={(e) => setS({ ...s, address: e.target.value })}
                className={inputCls}
              />
            </Field>
            <div className="grid gap-3.5 sm:grid-cols-3">
              <Field label="Phone">
                <input
                  value={s.phone}
                  onChange={(e) => setS({ ...s, phone: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Email">
                <input
                  value={s.email}
                  onChange={(e) => setS({ ...s, email: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Tax registration no.">
                <input
                  value={s.tax}
                  onChange={(e) => setS({ ...s, tax: e.target.value })}
                  className={inputCls}
                />
              </Field>
            </div>
          </Card>
          <Card>
            <h3 className="mb-3 text-[15px]">Regional</h3>
            <div className="grid gap-3.5 sm:grid-cols-3">
              <Field label="Currency">
                <select
                  value={s.currency}
                  onChange={(e) => setS({ ...s, currency: e.target.value })}
                  className={cn(inputCls, "cursor-pointer")}
                >
                  <option>EGP</option>
                </select>
              </Field>
              <Field label="Price format">
                <select className={cn(inputCls, "cursor-pointer")}>
                  <option>7,850 EGP</option>
                </select>
              </Field>
              <Field label="Time zone">
                <input
                  value={s.tz}
                  onChange={(e) => setS({ ...s, tz: e.target.value })}
                  className={inputCls}
                />
              </Field>
            </div>
            <Row
              label="Arabic site with full right-to-left layout"
              on={s.rtl}
              onChange={() => setS({ ...s, rtl: !s.rtl })}
            />
            <Row
              label="Prices include VAT"
              on={s.vat}
              onChange={() => setS({ ...s, vat: !s.vat })}
            />
          </Card>
        </>
      )}

      {tab === "Checkout" && (
        <Card>
          <h3 className="mb-1 text-[15px]">Checkout</h3>
          <Row
            label="Guest checkout"
            hint="Customers can buy without an account"
            on={c.guest}
            onChange={() => setC({ ...c, guest: !c.guest })}
          />
          <Row
            label="Gift options at checkout"
            on={c.gift}
            onChange={() => setC({ ...c, gift: !c.gift })}
          />
          <Row label="Order notes" on={c.notes} onChange={() => setC({ ...c, notes: !c.notes })} />
          <Row
            label="Require phone verification (OTP) for COD"
            on={c.otp}
            onChange={() => setC({ ...c, otp: !c.otp })}
          />
          <div className="mt-3 max-w-[260px]">
            <Field label="Maximum COD order (EGP)">
              <input
                value={c.maxCod}
                onChange={(e) => setC({ ...c, maxCod: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
        </Card>
      )}

      {tab === "Notifications" && (
        <>
          <Card>
            <h3 className="mb-3 text-[15px]">Emails & SMS to customers</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-[.12em] text-muted-foreground">
                    {["Message", "Email", "SMS", "WhatsApp", ""].map((h, i) => (
                      <th key={i} className="px-3 py-2.5 font-normal">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {msgs.map((m, i) => (
                    <tr key={m[0]} className="border-b border-line-soft last:border-0">
                      <td className="px-3 py-3">
                        <b className="font-medium">{m[0]}</b>
                      </td>
                      {([1, 2, 3] as const).map((col) => (
                        <td key={col} className="px-3 py-3">
                          <input
                            type="checkbox"
                            aria-label={`${m[0]} ${["", "email", "SMS", "WhatsApp"][col]}`}
                            checked={m[col] as boolean}
                            onChange={() => flip(i, col)}
                            className="size-4 cursor-pointer accent-[#0a0a0a]"
                          />
                        </td>
                      ))}
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => toast("Opening template (EN + AR)")}
                          className="underline underline-offset-[3px]"
                        >
                          Edit template
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Card>
            <h3 className="mb-1 text-[15px]">Alerts to the team</h3>
            <p className="mb-1 text-[12.5px] text-muted-foreground">
              Each alert goes to the email addresses you list — add as many as you need, including
              shared mailboxes.
            </p>
            {alertRows.map(([k, label, hint]) => (
              <Row
                key={k}
                label={label}
                hint={hint}
                on={alerts[k].on}
                onChange={() => setAlert(k, { on: !alerts[k].on })}
              >
                <EmailListEditor value={alerts[k].to} onChange={(to) => setAlert(k, { to })} />
              </Row>
            ))}
          </Card>
        </>
      )}

      {tab === "Policies" && (
        <Card>
          <h3 className="mb-3 text-[15px]">Store policies</h3>
          <Bi
            label="Returns policy"
            en={pol.ret}
            ar={pol.retAr}
            onEn={(v) => setPol({ ...pol, ret: v })}
            onAr={(v) => setPol({ ...pol, retAr: v })}
            rows={4}
          />
          <Bi
            label="Delivery policy"
            en={pol.del}
            ar={pol.delAr}
            onEn={(v) => setPol({ ...pol, del: v })}
            onAr={(v) => setPol({ ...pol, delAr: v })}
            rows={3}
          />
        </Card>
      )}
    </>
  );
}
