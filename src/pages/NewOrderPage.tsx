import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  customersQuery,
  enquiriesQuery,
  orderFormQuery,
  ordersQuery,
} from "@/lib/api/sections.functions";
import type { OrderDetail, OrderEvent, OrderFormData } from "@/lib/api/section-types";
import { formatMoney, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Chip, Panel, Thumb, Toggle } from "@/components/admin/primitives";
import { Button, PageHeader } from "@/components/admin/page";
import { useCustomers } from "@/components/admin/CustomerFlow";
import { editEnquiry, quoteTotal, setStage, useEnquiries } from "@/components/admin/EnquiryFlow";
import {
  addOrder,
  removeDraft,
  saveDraft,
  useCreatedOrders,
  useLocalDrafts,
} from "@/components/admin/OrderFlow";
import { useSessionUser } from "@/hooks/use-session";

type Fulfil = "Courier" | "Appointment" | "Pickup";
type Pay = "Paymob payment link" | "Cash on Delivery" | "Bank transfer" | "Paid in cash";
interface Line {
  id: string;
  q: number;
  price: number;
}
interface Form {
  mode: "existing" | "new";
  cust: string | null;
  nc: { name: string; phone: string; email: string; optin: boolean };
  lines: Line[];
  fulfil: Fulfil;
  zone: string;
  when: string;
  address: string;
  src: string;
  pay: Pay;
  disc: number;
  code: string;
  note: string;
  wrap: string;
  engraving: string;
  message: string;
  hide: boolean;
}
const blank = (zone: string): Form => ({
  mode: "existing",
  cust: null,
  nc: { name: "", phone: "", email: "", optin: false },
  lines: [],
  fulfil: "Courier",
  zone,
  when: "As soon as possible",
  address: "",
  src: "WhatsApp",
  pay: "Paymob payment link",
  disc: 0,
  code: "",
  note: "",
  wrap: "Ribbon wrapping",
  engraving: "None",
  message: "",
  hide: true,
});

const WRAPS: [string, number][] = [
  ["No gift wrap", 0],
  ["Ribbon wrapping", 0],
  ["Signature box upgrade · 450 EGP", 450],
];
const ENGRAVE: [string, number][] = [
  ["None", 0],
  ["Engraving · 350 EGP", 350],
  ["Embossing · 250 EGP", 250],
];
const FULFIL: [Fulfil, string, string][] = [
  ["Courier", "Courier · Bosta", "Delivered to the door"],
  ["Pickup", "Collect from office", "El Nozha El Gedida · free"],
];
const PAYS: [Pay, string, string][] = [
  ["Paymob payment link", "Send payment link", "By SMS / WhatsApp"],
  ["Cash on Delivery", "Cash on Delivery", "Collected at the door"],
  ["Bank transfer", "Bank transfer", "Confirm on receipt"],
  ["Paid in cash", "Paid in cash", "At the office, now"],
];
const PAY_HINT: Record<Pay, string> = {
  "Paymob payment link":
    "The customer gets a secure Paymob link. The order waits in Pending until they pay.",
  "Cash on Delivery": "The team calls to confirm before preparing, like any COD order.",
  "Bank transfer": "The order waits in Pending until the transfer arrives.",
  "Paid in cash": "Marked as paid straight away.",
};
const OFFICE = "12 Dr. Zakaria El Bardisi St., Office 3, El Nozha El Gedida, Cairo";

const field =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] outline-none focus:border-primary";
function Field({
  label,
  req,
  children,
  hint,
}: {
  label: ReactNode;
  req?: boolean;
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-[12px] text-muted-foreground">
      <span>
        {label}
        {req && <em className="not-italic text-bad"> *</em>}
      </span>
      {children}
      {hint && <span className="text-[11.5px]">{hint}</span>}
    </label>
  );
}
const Step = ({ n, done, children }: { n: number; done: boolean; children: ReactNode }) => (
  <span className="flex items-center gap-2.5">
    <i
      className={cn(
        "grid size-[22px] flex-none place-items-center rounded-full text-[11px] not-italic text-white",
        done ? "bg-good" : "bg-primary",
      )}
    >
      {done ? "✓" : n}
    </i>
    {children}
  </span>
);
const Opt = ({
  on,
  onClick,
  title,
  sub,
}: {
  on: boolean;
  onClick: () => void;
  title: string;
  sub: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "rounded-lg border bg-surface px-3.5 py-3 text-left",
      on ? "border-primary ring-1 ring-primary" : "border-border hover:border-line2",
    )}
  >
    <b className="block text-[13.5px] font-medium">{title}</b>
    <span className="text-[12px] text-muted-foreground">{sub}</span>
  </button>
);

/** Turns a saved server draft (customer name + lines by SKU) into form state. */
function fromServerDraft(
  d: { customer: string; lines: { sku: string; qty: number; price: number }[]; source: string },
  data: OrderFormData,
  zone: string,
): Form {
  const c = data.customers.find((x) => x.name === d.customer);
  return {
    ...blank(zone),
    cust: c?.id ?? null,
    src: data.sources.includes(d.source) ? d.source : "Instagram",
    fulfil: "Appointment",
    address: c?.address ?? "",
    zone: data.zones.find((z) => z.name === c?.city)?.name ?? zone,
    lines: d.lines
      .map((l) => ({
        id: data.products.find((p) => p.sku === l.sku)?.id ?? "",
        q: l.qty,
        price: l.price,
      }))
      .filter((l) => l.id),
  };
}

export default function NewOrderPage({
  draftId,
  customerId,
  enquiryId,
}: {
  draftId?: string | undefined;
  customerId?: string | undefined;
  enquiryId?: string | undefined;
}) {
  const { data } = useSuspenseQuery(orderFormQuery());
  const { data: orders } = useSuspenseQuery(ordersQuery());
  const { data: customersData } = useSuspenseQuery(customersQuery());
  const allCustomers = useCustomers(customersData.rows);
  const { data: enquiriesData } = useSuspenseQuery(enquiriesQuery());
  const fromEnq =
    useEnquiries(enquiriesData.rows).find((x) => x.id === enquiryId && x.quote.length) ?? null;
  const created = useCreatedOrders();
  const localDrafts = useLocalDrafts();
  const user = useSessionUser();
  const navigate = useNavigate();
  const zone0 = data.zones[0]?.name ?? "";

  const [f, setF] = useState<Form>(() => {
    const local = localDrafts.find((d) => d.id === draftId);
    if (local) return local.form as Form;
    const server = orders.drafts.find((d) => d.id === draftId);
    if (server) return fromServerDraft(server, data, zone0);
    // Converting a corporate enquiry: client, products and quoted prices come from its quotation.
    if (fromEnq) {
      const ex = allCustomers.find(
        (x) =>
          (x.email && x.email.toLowerCase() === fromEnq.email.toLowerCase()) ||
          x.phone.replace(/D/g, "").slice(-10) === fromEnq.phone.replace(/D/g, "").slice(-10),
      );
      const base: Form = {
        ...blank(zone0),
        fulfil: "Appointment",
        when: "26 Sep 2026 · 12:00 – 14:00",
        pay: "Bank transfer",
        src: "Email",
        lines: fromEnq.quote
          .filter((l) => data.products.some((p) => p.id === l.productId))
          .map((l) => ({ id: l.productId, q: l.qty, price: l.unit + l.pers })),
      };
      return ex && data.customers.some((x) => x.id === ex.id)
        ? { ...base, cust: ex.id, address: ex.address }
        : {
            ...base,
            mode: "new",
            nc: {
              name: `${fromEnq.contact} · ${fromEnq.company}`,
              phone: fromEnq.phone,
              email: fromEnq.email,
              optin: false,
            },
          };
    }
    // Opened from a customer page: start with that customer chosen.
    const c = allCustomers.find((x) => x.id === customerId);
    if (!c) return blank(zone0);
    const zone = data.zones.find((z) => z.name === c.city)?.name ?? zone0;
    return data.customers.some((x) => x.id === c.id)
      ? { ...blank(zone), cust: c.id, address: c.address }
      : {
          ...blank(zone),
          mode: "new",
          nc: { name: c.name, phone: c.phone, email: c.email, optin: c.marketing.email },
          address: c.address,
        };
  });
  const [cq, setCq] = useState("");
  const [pq, setPq] = useState("");
  const [err, setErr] = useState("");
  const set = (p: Partial<Form>) => {
    setF((x) => ({ ...x, ...p }));
    setErr("");
  };

  const prod = (id: string) => data.products.find((p) => p.id === id);
  const cust =
    f.mode === "existing" && f.cust ? (data.customers.find((c) => c.id === f.cust) ?? null) : null;
  const hasCust = f.mode === "existing" ? !!cust : !!(f.nc.name.trim() && f.nc.phone.trim());
  const fee = f.fulfil === "Courier" ? (data.zones.find((z) => z.name === f.zone)?.fee ?? 0) : 0;
  const sub = f.lines.reduce((a, l) => a + l.price * l.q, 0);
  const extras =
    (WRAPS.find((w) => w[0] === f.wrap)?.[1] ?? 0) +
    (ENGRAVE.find((w) => w[0] === f.engraving)?.[1] ?? 0);
  const total = Math.max(0, sub - f.disc) + extras + fee;

  const custList = useMemo(() => {
    const q = cq.toLowerCase().trim(),
      qd = q.replace(/\D/g, "");
    return data.customers.filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (qd.length >= 3 && c.phone.replace(/\D/g, "").includes(qd)),
    );
  }, [cq, data.customers]);
  const prodList = useMemo(() => {
    const q = pq.toLowerCase().trim();
    return data.products
      .filter((p) => !q || `${p.name} ${p.sku} ${p.brand}`.toLowerCase().includes(q))
      .slice(0, 40);
  }, [pq, data.products]);

  const pickCust = (id: string | null) => {
    const c = id ? data.customers.find((x) => x.id === id) : null;
    set({
      cust: id,
      ...(c && {
        address: c.address,
        zone: data.zones.find((z) => z.name === c.city)?.name ?? f.zone,
      }),
    });
  };
  const addLine = (id: string) => {
    const p = prod(id)!;
    set({
      lines: f.lines.some((l) => l.id === id)
        ? f.lines.map((l) => (l.id === id ? { ...l, q: l.q + 1 } : l))
        : [...f.lines, { id, q: 1, price: p.price ?? 0 }],
    });
  };
  const setLine = (i: number, p: Partial<Line>) =>
    set({ lines: f.lines.map((l, j) => (j === i ? { ...l, ...p } : l)) });
  const setFulfil = (v: Fulfil) =>
    set({
      fulfil: v,
      ...(v === "Pickup" && f.pay === "Cash on Delivery" && { pay: "Paid in cash" as Pay }),
      when: v === "Appointment" ? "26 Sep 2026 · 12:00 – 14:00" : "As soon as possible",
    });

  const custName = () => (cust ? cust.name : f.nc.name.trim());
  const draft = () => {
    if (!hasCust && !f.lines.length) {
      setErr("Add a customer or a product before saving a draft.");
      return;
    }
    const id = draftId ?? `D-0${32 + localDrafts.length}`;
    saveDraft({
      id,
      saved: "Just now",
      by: user?.name ?? "You",
      customer: custName() || "—",
      source: f.src,
      total,
      lines: f.lines.map((l) => {
        const p = prod(l.id)!;
        return { name: p.name, sku: p.sku, qty: l.q, price: l.price };
      }),
      form: f,
    });
    toast(`Draft saved · ${id}`);
    navigate({ to: "/$section", params: { section: "orders" } });
  };

  const place = () => {
    const miss = !hasCust
      ? f.mode === "new"
        ? "Add the customer's name and mobile."
        : "Choose a customer."
      : !f.lines.length
        ? "Add at least one product."
        : f.lines.some((l) => !l.price)
          ? "Set a price for every enquiry item."
          : f.fulfil !== "Pickup" && !f.address.trim()
            ? "Add the delivery address."
            : "";
    if (miss) {
      setErr(miss);
      return;
    }
    const all = [...created.map((o) => o.id), ...orders.rows.map((o) => o.id)];
    const id = `ZL-${Math.max(...all.map((x) => Number(x.slice(3)) || 0)) + 1}`;
    const who = user?.name ?? "You";
    const c = cust ?? {
      id: "new",
      name: f.nc.name.trim(),
      phone: f.nc.phone.trim(),
      email: f.nc.email.trim() || "—",
      orders: 0,
      city: f.zone,
    };
    const paid = f.pay === "Paid in cash";
    const payLabel = paid ? "Paid" : f.pay === "Cash on Delivery" ? "Unpaid" : "Awaiting payment";
    const history: OrderEvent[] = [
      { text: `Order created manually · from ${f.src}`, when: "Just now", who },
    ];
    if (f.pay === "Paymob payment link")
      history.push({
        text: `Paymob payment link sent to ${c.phone}`,
        when: "Just now",
        who: "Paymob",
      });
    if (paid)
      history.push({
        text: `Paid in cash at the office · ${formatMoney(total)}`,
        when: "Just now",
        who,
      });
    if (f.note.trim()) history.push({ text: `Note: ${f.note.trim()}`, when: "Just now", who });
    const order: OrderDetail = {
      id,
      date: "Today, just now",
      customer: c.name,
      itemCount: f.lines.length,
      payment: f.pay,
      payStatus: { label: payLabel, tone: paid ? "ok" : "warn" },
      fulfilment: f.fulfil,
      status: { label: "Pending", tone: "warn" },
      total,
      zone: f.fulfil === "Pickup" ? "Office pickup" : f.zone,
      lines: f.lines.map((l) => {
        const p = prod(l.id)!;
        return { name: p.name, sku: p.sku, qty: l.q, price: l.price };
      }),
      manual: true,
      awb: null,
      appointment: f.fulfil === "Appointment" ? f.when : null,
      customerInfo: {
        id: c.id,
        name: c.name,
        email: c.email || "—",
        phone: c.phone,
        orders: c.orders + 1,
        spent: total,
      },
      subtotal: sub,
      discount: f.disc,
      delivery: fee,
      address: f.fulfil === "Pickup" ? OFFICE : f.address.trim(),
      transactionId: null,
      gift: { wrap: f.wrap, message: f.message.trim() || "—", hidePrices: f.hide },
      history,
    };
    if (fromEnq)
      order.history.push({
        text: `Created from corporate enquiry ${fromEnq.id} · ${fromEnq.company}`,
        when: "Just now",
        who,
      });
    addOrder(order);
    if (draftId) removeDraft(draftId);
    if (fromEnq) {
      setStage(fromEnq, "Won", who);
      editEnquiry(
        fromEnq.id,
        { order: id },
        { via: "System", text: `Converted to order ${id} · ${formatMoney(total)} · by ${who}` },
      );
    }
    toast(`Order ${id} created`);
    navigate({ to: "/orders/$orderId", params: { orderId: id } });
  };

  return (
    <>
      <div className="mb-2 text-[12px] text-muted-foreground">
        <Link
          to="/$section"
          params={{ section: "orders" }}
          className="underline underline-offset-[3px]"
        >
          Orders
        </Link>{" "}
        / New order
      </div>
      <PageHeader
        title={
          draftId
            ? `Create manual order · Draft ${draftId}`
            : fromEnq
              ? `Create order · ${fromEnq.company}`
              : "Create manual order"
        }
        subtitle="For orders taken by phone, WhatsApp, Instagram or in person. It joins the same flow as website orders."
        actions={
          <Button onClick={() => navigate({ to: "/$section", params: { section: "orders" } })}>
            Cancel
          </Button>
        }
      />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-5">
          {/* 1 · Customer */}
          <Panel
            title={
              <Step n={1} done={hasCust}>
                Customer
              </Step>
            }
          >
            <div className="mb-3.5 inline-flex gap-0.5 rounded-full border border-border bg-surface p-[3px]">
              {(["existing", "new"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => set({ mode: m })}
                  className={cn(
                    "h-[30px] rounded-full px-3.5 text-[12.5px]",
                    f.mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                  )}
                >
                  {m === "existing" ? "Existing customer" : "New customer"}
                </button>
              ))}
            </div>
            {f.mode === "existing" ? (
              cust ? (
                <div className="flex items-center gap-3 rounded-lg border border-primary px-3.5 py-3 text-[13px]">
                  <div>
                    <b className="block font-medium">{cust.name}</b>
                    <span className="text-[12px] text-muted-foreground">
                      {cust.phone} · {cust.email} · {cust.orders} orders · {cust.city}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => pickCust(null)}
                    className="ml-auto text-[12.5px] underline underline-offset-[3px]"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <>
                  <input
                    value={cq}
                    onChange={(e) => setCq(e.target.value)}
                    placeholder="Search by name, phone or email"
                    className={field}
                  />
                  <div className="mt-2 max-h-[260px] overflow-auto rounded-lg border border-border">
                    {custList.length ? (
                      custList.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => pickCust(c.id)}
                          className="flex w-full items-center gap-3 border-b border-line-soft px-3 py-2.5 text-left text-[13px] last:border-0 hover:bg-hover"
                        >
                          <div>
                            <b className="block font-medium">{c.name}</b>
                            <span className="text-[12px] text-muted-foreground">
                              {c.phone} · {c.city} · {c.orders} orders
                            </span>
                          </div>
                          <span className="ml-auto rounded-full border border-line2 px-2.5 py-0.5 text-[12px]">
                            Select
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="p-4 text-[13px] text-muted-foreground">
                        No customer matches. Switch to "New customer" to add them.
                      </p>
                    )}
                  </div>
                </>
              )
            ) : (
              <>
                <div className="grid gap-3.5 md:grid-cols-3">
                  <Field label="Full name" req>
                    <input
                      value={f.nc.name}
                      onChange={(e) => set({ nc: { ...f.nc, name: e.target.value } })}
                      placeholder="e.g. Mariam Adel"
                      className={field}
                    />
                  </Field>
                  <Field label="Mobile" req>
                    <input
                      value={f.nc.phone}
                      onChange={(e) => set({ nc: { ...f.nc, phone: e.target.value } })}
                      placeholder="+20 1xx xxx xxxx"
                      className={field}
                    />
                  </Field>
                  <Field label="Email (optional)">
                    <input
                      value={f.nc.email}
                      onChange={(e) => set({ nc: { ...f.nc, email: e.target.value } })}
                      placeholder="name@example.com"
                      className={field}
                    />
                  </Field>
                </div>
                <label className="mt-3 flex items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    checked={f.nc.optin}
                    onChange={(e) => set({ nc: { ...f.nc, optin: e.target.checked } })}
                    className="accent-[#0a0a0a]"
                  />{" "}
                  Customer agrees to receive offers by email
                </label>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  A customer record is created when the order is placed.
                </p>
              </>
            )}
          </Panel>

          {/* 2 · Products */}
          <Panel
            title={
              <Step n={2} done={f.lines.length > 0}>
                Products
              </Step>
            }
          >
            {f.lines.length ? (
              f.lines.map((l, i) => {
                const p = prod(l.id)!;
                return (
                  <div
                    key={l.id}
                    className="grid grid-cols-[44px_minmax(0,1fr)_110px_120px_28px] items-center gap-3 border-b border-line-soft py-3 text-[13px] max-sm:grid-cols-[40px_minmax(0,1fr)_90px]"
                  >
                    <Thumb color={p.color} />
                    <div>
                      <b className="block font-medium">{p.name}</b>
                      <span className="text-[12px] text-muted-foreground">
                        {p.sku} · {p.brand}
                        {p.stock <= 2 && <span className="text-warn"> · only {p.stock} left</span>}
                      </span>
                    </div>
                    <div className="inline-flex h-8 overflow-hidden rounded-lg border border-border">
                      <button
                        type="button"
                        className="w-[30px]"
                        onClick={() => setLine(i, { q: Math.max(1, l.q - 1) })}
                      >
                        −
                      </button>
                      <em className="grid min-w-[30px] place-items-center border-x border-border not-italic">
                        {l.q}
                      </em>
                      <button
                        type="button"
                        className="w-[30px]"
                        onClick={() => setLine(i, { q: l.q + 1 })}
                      >
                        +
                      </button>
                    </div>
                    <div className="text-right">
                      {p.price ? (
                        <>
                          <b className="block font-medium">{formatMoney(l.price * l.q)}</b>
                          <span className="text-[12px] text-muted-foreground">
                            {formatNumber(l.price)} each
                          </span>
                        </>
                      ) : (
                        <>
                          <input
                            value={l.price ? formatNumber(l.price) : ""}
                            onChange={(e) =>
                              setLine(i, {
                                price: Number(e.target.value.replace(/[^\d]/g, "")) || 0,
                              })
                            }
                            placeholder="Price EGP"
                            className="h-8 w-full rounded-lg border border-border px-2 text-right"
                          />
                          <span className="text-[11.5px] text-muted-foreground">
                            Enquiry item · set price
                          </span>
                        </>
                      )}
                    </div>
                    <button
                      type="button"
                      title="Remove"
                      onClick={() => set({ lines: f.lines.filter((_, j) => j !== i) })}
                      className="text-muted-foreground hover:text-bad"
                    >
                      ✕
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="py-2.5 text-[13px] text-muted-foreground">
                No products yet — search below and add.
              </p>
            )}
            <div className="mt-3.5">
              <input
                value={pq}
                onChange={(e) => setPq(e.target.value)}
                placeholder="Search products by name, SKU or maison"
                className={field}
              />
              <div className="mt-2 max-h-[260px] overflow-auto rounded-lg border border-border">
                {prodList.map((p) => {
                  const inn = f.lines.some((l) => l.id === p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addLine(p.id)}
                      className="flex w-full items-center gap-3 border-b border-line-soft px-3 py-2.5 text-left text-[13px] last:border-0 hover:bg-hover"
                    >
                      <Thumb color={p.color} />
                      <div className="min-w-0">
                        <b className="block truncate font-medium">{p.name}</b>
                        <span className="text-[12px] text-muted-foreground">
                          {p.brand} · {p.price ? formatMoney(p.price) : "Enquiry item"} · {p.stock}{" "}
                          in stock
                        </span>
                      </div>
                      <span
                        className={cn(
                          "ml-auto whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[12px]",
                          inn
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-line2",
                        )}
                      >
                        {inn ? "Added ✓" : "+ Add"}
                      </span>
                    </button>
                  );
                })}
                {!prodList.length && (
                  <p className="p-4 text-[13px] text-muted-foreground">
                    No product matches “{pq}”.
                  </p>
                )}
              </div>
            </div>
          </Panel>

          {/* 3 · Delivery */}
          <Panel
            title={
              <Step n={3} done={f.fulfil === "Pickup" || !!f.address.trim()}>
                Delivery
              </Step>
            }
          >
            <div className="mb-3.5 grid gap-2.5 md:grid-cols-3">
              {FULFIL.map(([v, t, s]) => (
                <Opt key={v} on={f.fulfil === v} onClick={() => setFulfil(v)} title={t} sub={s} />
              ))}
            </div>
            {f.fulfil === "Pickup" ? (
              <p className="text-[12.5px] text-muted-foreground">
                Customer collects from {OFFICE}. We tell them when it's ready.
              </p>
            ) : (
              <div className="flex flex-col gap-3.5">
                <div className="grid gap-3.5 md:grid-cols-2">
                  <Field label="Area">
                    <select
                      value={f.zone}
                      onChange={(e) => set({ zone: e.target.value })}
                      className={field}
                    >
                      {data.zones.map((z) => (
                        <option key={z.name} value={z.name}>
                          {z.name} · {f.fulfil === "Courier" ? `${z.fee} EGP` : "free"}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={f.fulfil === "Appointment" ? "Appointment slot" : "Preferred date"}>
                    <select
                      value={f.when}
                      onChange={(e) => set({ when: e.target.value })}
                      className={field}
                    >
                      {(f.fulfil === "Appointment"
                        ? [
                            "25 Sep 2026 · 16:00 – 18:00",
                            "26 Sep 2026 · 12:00 – 14:00",
                            "27 Sep 2026 · 10:00 – 12:00",
                          ]
                        : ["As soon as possible", "Tomorrow", "Choose a date"]
                      ).map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field
                  label={
                    <>
                      Full address
                      {cust && (
                        <span className="text-muted-foreground">
                          {" "}
                          · from {cust.name.split(" ")[0]}'s record — edit if different
                        </span>
                      )}
                    </>
                  }
                  req
                >
                  <input
                    value={f.address}
                    onChange={(e) => set({ address: e.target.value })}
                    placeholder="Building, street, floor, apartment, landmark"
                    className={field}
                  />
                </Field>
              </div>
            )}
          </Panel>

          {/* 4 · Gift options */}
          <Panel
            title={
              <Step n={4} done>
                Gift options
              </Step>
            }
          >
            <div className="grid gap-3.5 md:grid-cols-2">
              <Field label="Gift wrap">
                <select
                  value={f.wrap}
                  onChange={(e) => set({ wrap: e.target.value })}
                  className={field}
                >
                  {WRAPS.map((w) => (
                    <option key={w[0]}>{w[0]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Engraving">
                <select
                  value={f.engraving}
                  onChange={(e) => set({ engraving: e.target.value })}
                  className={field}
                >
                  {ENGRAVE.map((w) => (
                    <option key={w[0]}>{w[0]}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="mt-3.5">
              <Field label="Gift message card">
                <textarea
                  rows={2}
                  maxLength={200}
                  value={f.message}
                  onChange={(e) => set({ message: e.target.value })}
                  placeholder="Up to 200 characters"
                  className={cn(field, "h-auto py-2")}
                />
              </Field>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-[13.5px]">
              <span>Hide prices on the invoice</span>
              <Toggle
                on={f.hide}
                onChange={() => set({ hide: !f.hide })}
                label="Hide prices on the invoice"
              />
            </div>
          </Panel>
        </div>

        {/* Side: details + summary */}
        <div className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-[84px]">
          <Panel title="Order details">
            <div className="flex flex-col gap-3.5">
              <Field label="Order came from">
                <select
                  value={f.src}
                  onChange={(e) => set({ src: e.target.value })}
                  className={field}
                >
                  {data.sources.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <div>
                <div className="mb-1.5 text-[12px] text-muted-foreground">Payment</div>
                <div className="grid grid-cols-2 gap-2">
                  {PAYS.filter(([v]) => !(v === "Cash on Delivery" && f.fulfil === "Pickup")).map(
                    ([v, t, s]) => (
                      <Opt
                        key={v}
                        on={f.pay === v}
                        onClick={() => set({ pay: v })}
                        title={t}
                        sub={s}
                      />
                    ),
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <Field label="Discount (EGP)">
                  <input
                    value={f.disc || ""}
                    onChange={(e) =>
                      set({ disc: Number(e.target.value.replace(/[^\d]/g, "")) || 0 })
                    }
                    placeholder="0"
                    className={field}
                  />
                </Field>
                <Field label="or discount code">
                  <input
                    value={f.code}
                    onChange={(e) => set({ code: e.target.value.toUpperCase() })}
                    placeholder="e.g. WELCOME10"
                    className={field}
                  />
                </Field>
              </div>
              <Field label="Internal note">
                <textarea
                  rows={2}
                  value={f.note}
                  onChange={(e) => set({ note: e.target.value })}
                  placeholder="Only the team sees this"
                  className={cn(field, "h-auto py-2")}
                />
              </Field>
            </div>
          </Panel>

          <Panel title="Summary">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13px]">
              {(
                [
                  ["Items", String(f.lines.reduce((a, l) => a + l.q, 0))],
                  ["Subtotal", formatMoney(sub)],
                  ["Discount", f.disc ? `− ${formatMoney(f.disc)}` : "—"],
                  ...(extras ? [["Gift services", formatMoney(extras)]] : []),
                  ["Delivery", f.fulfil === "Courier" ? formatMoney(fee) : "Free"],
                ] as [string, string][]
              ).map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-right">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-1.5 flex items-baseline justify-between border-t border-border pt-3">
              <span>Total</span>
              <b className="font-head text-[26px] font-normal">{formatMoney(total)}</b>
            </div>
            <button
              type="button"
              onClick={place}
              className="mt-3 h-12 w-full rounded-lg bg-primary text-[13px] text-primary-foreground hover:opacity-90"
            >
              Place order
            </button>
            <p className="mt-2.5 min-h-4 text-[12.5px] text-bad">{err}</p>
            <button
              type="button"
              onClick={draft}
              className="mt-1 block w-full text-center text-[12px] text-muted-foreground underline underline-offset-[3px]"
            >
              Save as draft
            </button>
            <p className="mt-3 text-[12px] text-muted-foreground">{PAY_HINT[f.pay]}</p>
            {f.code && (
              <p className="mt-2">
                <Chip>Code {f.code} · checked when the order is placed</Chip>
              </p>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
