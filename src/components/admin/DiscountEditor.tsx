// Create / edit a promotion (coupon, offer or cart discount). Saves go to the shared promotion store (DiscountFlow) — swap for API mutations later.
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { categoriesQuery, discountsQuery, productsQuery } from "@/lib/api/sections.functions";
import { cn } from "@/lib/utils";
import { StatusBadge, Toggle } from "@/components/admin/primitives";
import { Button } from "@/components/admin/page";
import {
  APPLY_ON,
  COUPON_SCOPES,
  MODES,
  PROMOTION_TYPES,
  addPromotion,
  appliesTo,
  benefit,
  blank,
  datesLabel,
  deletePromotion,
  editPromotion,
  randomCode,
  statusOf,
  typeMeta,
  usePromotions,
  type Mode,
  type Promotion,
  type Scope,
} from "@/components/admin/DiscountFlow";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const inputCls =
  "h-9 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-[14px] outline-none focus:border-primary";
const digits = (s: string) => s.replace(/[^\d.]/g, "");

function Card({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="mb-[18px] min-w-0 rounded-[10px] border border-border bg-surface px-5 pb-5 pt-4">
      <h3 className="text-[15px]">{title}</h3>
      {hint ? (
        <p className="mb-3 mt-0.5 text-[12px] text-muted-foreground">{hint}</p>
      ) : (
        <div className="mb-3" />
      )}
      {children}
    </section>
  );
}
function Field({
  label,
  hint,
  req,
  children,
}: {
  label: string;
  hint?: string | undefined;
  req?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="mb-3.5 flex min-w-0 flex-col gap-1.5">
      <label className="flex gap-1 text-[12px] text-muted-foreground">
        {label}
        {req && <em className="not-italic text-bad">*</em>}
      </label>
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
}: {
  label: string;
  hint?: string;
  on: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3.5 border-b border-line-soft py-2.5 last:border-b-0">
      <div>
        <div className="text-[13.5px]">{label}</div>
        {hint && <div className="mt-0.5 text-[12px] text-muted-foreground">{hint}</div>}
      </div>
      <Toggle on={on} onChange={onChange} label={label} />
    </div>
  );
}
function Choice<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; hint?: string }[];
}) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-[repeat(auto-fit,minmax(160px,1fr))]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-lg border px-3 py-2.5 text-left",
            value === o.value ? "border-primary bg-hover" : "border-border hover:bg-hover",
          )}
        >
          <div className="text-[13.5px]">{o.label}</div>
          {o.hint && <div className="mt-0.5 text-[12px] text-muted-foreground">{o.hint}</div>}
        </button>
      ))}
    </div>
  );
}
const ModeSelect = ({ value, onChange }: { value: Mode; onChange: (m: Mode) => void }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value as Mode)}
    className={cn(inputCls, "cursor-pointer")}
  >
    {MODES.map((m) => (
      <option key={m.value} value={m.value}>
        {m.label}
      </option>
    ))}
  </select>
);

export function DiscountEditor({ code: id }: { code?: string | undefined }) {
  const { data } = useSuspenseQuery(discountsQuery());
  const { data: cats } = useSuspenseQuery(categoriesQuery());
  const { data: prods } = useSuspenseQuery(productsQuery());
  const all = usePromotions(data);
  const navigate = useNavigate();
  const p = id ? all.find((x) => x.id === id) : undefined;
  const isNew = !id;

  const [f, setF] = useState<Promotion>(() => p ?? blank());
  const [picker, setPicker] = useState<null | "items" | "buy" | "get">(null);
  const [q, setQ] = useState("");
  const [askDelete, setAskDelete] = useState(false);
  const set = <K extends keyof Promotion>(k: K, v: Promotion[K]) => setF((x) => ({ ...x, [k]: v }));

  if (!isNew && !p)
    return <p className="py-24 text-center text-muted-foreground">This promotion was not found.</p>;

  const prodNames = prods.rows.map((x) => x.name);
  const catNames = cats.map((c) => c.name);
  // which scope drives the item list for this promotion type
  const itemScope: Scope =
    f.type === "coupon"
      ? f.scope
      : f.type === "offer" && f.offerType === "discount"
        ? f.applyOn
        : "common";
  const setItemScope = (s: Scope) =>
    setF((x) => ({
      ...x,
      scope: x.type === "coupon" ? s : x.scope,
      applyOn: x.type === "offer" ? s : x.applyOn,
      items: [],
    }));
  const pickerOptions =
    picker === "items" ? (itemScope === "category" ? catNames : prodNames) : prodNames;
  const pickerTitle =
    picker === "buy"
      ? "Buy product"
      : picker === "get"
        ? f.type === "cartDiscount"
          ? "Reward product"
          : "Get product"
        : itemScope === "category"
          ? "Categories"
          : "Products";
  const usesItems =
    (f.type === "coupon" || (f.type === "offer" && f.offerType === "discount")) &&
    itemScope !== "common";
  const isBogo = f.type === "offer" && f.offerType === "bogo";
  const isGift = f.type === "cartDiscount" && f.cartType === "product";
  const hasReward = isBogo || isGift;

  const save = () => {
    const name = f.name.trim();
    const codeUp = f.code.trim().toUpperCase();
    if (name.length < 2) {
      toast("Name must be at least 2 characters");
      return;
    }
    if (f.type === "coupon") {
      if (!codeUp) {
        toast("Enter the coupon code");
        return;
      }
      if (all.some((x) => x.id !== f.id && x.type === "coupon" && x.code === codeUp)) {
        toast(`The code ${codeUp} already exists`);
        return;
      }
      if (!f.value) {
        toast("Enter the coupon value");
        return;
      }
    }
    if (f.type === "offer" && f.offerType === "discount" && !f.discountValue) {
      toast("Enter the discount value");
      return;
    }
    if (f.type === "cartDiscount" && f.cartType === "discount" && !f.value) {
      toast("Enter the discount value");
      return;
    }
    if (usesItems && !f.items.length) {
      toast(`Add at least one ${itemScope === "category" ? "category" : "product"}`);
      return;
    }
    if (isBogo && !f.buyProduct) {
      toast("Choose the product the customer buys");
      return;
    }
    if (hasReward && !f.getProduct) {
      toast("Choose the reward product");
      return;
    }
    if (f.starts && f.ends && f.ends < f.starts) {
      toast("The end date is before the start date");
      return;
    }
    const row = {
      ...f,
      name,
      code: f.type === "coupon" ? codeUp : "",
      items: usesItems ? f.items : [],
    };
    if (isNew) {
      const { id: _drop, ...rest } = row;
      const nid = addPromotion(rest);
      toast(`${name} created`);
      navigate({ to: "/discounts/$code", params: { code: nid } });
    } else {
      editPromotion(row.id, row);
      toast("Promotion saved");
    }
  };

  const status = statusOf(f);
  const meta = typeMeta(f.type);

  return (
    <>
      <div className="mb-[22px]">
        <div className="mb-2 text-[12px] text-muted-foreground">
          <Link to="/discounts" className="underline underline-offset-[3px]">
            Discounts & offers
          </Link>{" "}
          / {p?.name ?? "New"}
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-[28px] leading-tight">{isNew ? "Create promotion" : p!.name}</h1>
          <Button primary onClick={save}>
            {isNew ? "Create promotion" : "Save"}
          </Button>
        </div>
      </div>
      <div className="grid items-start gap-[18px] min-[981px]:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <Card title="Promotion type" hint="Choose the promotional model you want to configure.">
            <Choice value={f.type} onChange={(v) => set("type", v)} options={PROMOTION_TYPES} />
          </Card>

          <Card title="General">
            <Field label="Promotion name" req>
              <input
                value={f.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Ramadan 15% off"
                className={inputCls}
              />
            </Field>
            <Field label="Description">
              <textarea
                value={f.description}
                onChange={(e) => set("description", e.target.value)}
                rows={2}
                placeholder="Details or terms for this promotion"
                className={cn(inputCls, "h-auto py-2")}
              />
            </Field>
            <div className="max-w-[200px]">
              <Field label="Sort order" hint="Lower shows first">
                <input
                  value={f.sortOrder}
                  onChange={(e) => set("sortOrder", digits(e.target.value))}
                  className={inputCls}
                />
              </Field>
            </div>
          </Card>

          {f.type === "coupon" && (
            <Card
              title="Coupon"
              hint="Promo code, value, minimum requirements and who it applies to."
            >
              <Field label="Coupon code" req hint="Customers type this at checkout">
                <div className="flex gap-2">
                  <input
                    value={f.code}
                    onChange={(e) => set("code", e.target.value.toUpperCase())}
                    placeholder="e.g. SAVE20"
                    className={cn(inputCls, "font-mono tracking-wider")}
                  />
                  <Button onClick={() => set("code", randomCode())}>Generate</Button>
                </div>
              </Field>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field label="Discount type">
                  <ModeSelect value={f.couponMode} onChange={(v) => set("couponMode", v)} />
                </Field>
                <Field label={f.couponMode === "percentage" ? "Percentage" : "Amount (EGP)"} req>
                  <input
                    value={f.value}
                    onChange={(e) => set("value", digits(e.target.value))}
                    className={inputCls}
                  />
                </Field>
                <Field label="Minimum cart value (EGP)">
                  <input
                    value={f.min}
                    onChange={(e) => set("min", digits(e.target.value))}
                    className={inputCls}
                  />
                </Field>
                {f.couponMode === "percentage" && (
                  <Field label="Maximum discount (EGP)" hint="Caps the percentage">
                    <input
                      value={f.maxDiscount}
                      onChange={(e) => set("maxDiscount", digits(e.target.value))}
                      className={inputCls}
                    />
                  </Field>
                )}
              </div>
              <Field label="Customer scope">
                <Choice value={f.scope} onChange={setItemScope} options={COUPON_SCOPES} />
              </Field>
            </Card>
          )}

          {f.type === "offer" && (
            <Card
              title="Offer"
              hint="Automatic discount on catalogue products, or a buy-X-get-Y deal."
            >
              <Field label="Offer type">
                <Choice
                  value={f.offerType}
                  onChange={(v) => set("offerType", v)}
                  options={[
                    {
                      value: "discount",
                      label: "Direct discount",
                      hint: "Percentage or amount off products or categories",
                    },
                    {
                      value: "bogo",
                      label: "Buy X get Y (BOGO)",
                      hint: "Buy items and get others free or discounted",
                    },
                  ]}
                />
              </Field>
              {f.offerType === "discount" && (
                <>
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <Field label="Discount type">
                      <ModeSelect value={f.discountMode} onChange={(v) => set("discountMode", v)} />
                    </Field>
                    <Field
                      label={f.discountMode === "percentage" ? "Percentage" : "Amount (EGP)"}
                      req
                    >
                      <input
                        value={f.discountValue}
                        onChange={(e) => set("discountValue", digits(e.target.value))}
                        className={inputCls}
                      />
                    </Field>
                  </div>
                  <Field label="Apply offer on">
                    <select
                      value={f.applyOn}
                      onChange={(e) => setItemScope(e.target.value as Scope)}
                      className={cn(inputCls, "cursor-pointer")}
                    >
                      {APPLY_ON.map((a) => (
                        <option key={a.value} value={a.value}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </>
              )}
            </Card>
          )}

          {f.type === "cartDiscount" && (
            <Card
              title="Cart auto-discount"
              hint="Applied automatically when the cart reaches the minimum."
            >
              <Field label="Reward">
                <Choice
                  value={f.cartType}
                  onChange={(v) => set("cartType", v)}
                  options={[
                    {
                      value: "discount",
                      label: "Cart discount (amount / %)",
                      hint: "Reduces the cart subtotal",
                    },
                    {
                      value: "product",
                      label: "Free gift / reward product",
                      hint: "Adds a free or discounted product",
                    },
                  ]}
                />
              </Field>
              <div className="grid gap-3.5 sm:grid-cols-2">
                {f.cartType === "discount" && (
                  <>
                    <Field label="Discount type">
                      <ModeSelect value={f.couponMode} onChange={(v) => set("couponMode", v)} />
                    </Field>
                    <Field
                      label={f.couponMode === "percentage" ? "Percentage" : "Amount (EGP)"}
                      req
                    >
                      <input
                        value={f.value}
                        onChange={(e) => set("value", digits(e.target.value))}
                        className={inputCls}
                      />
                    </Field>
                  </>
                )}
                <Field label="Cart threshold (EGP)" hint="Minimum cart value to trigger">
                  <input
                    value={f.min}
                    onChange={(e) => set("min", digits(e.target.value))}
                    className={inputCls}
                  />
                </Field>
              </div>
            </Card>
          )}

          {usesItems && (
            <Card
              title={itemScope === "category" ? "Applicable categories" : "Applicable products"}
            >
              <div className="flex flex-wrap items-center gap-1.5">
                {f.items.map((s) => (
                  <span
                    key={s}
                    className="rounded-lg border border-border px-2 py-0.5 text-[11.5px]"
                  >
                    {s}{" "}
                    <button
                      type="button"
                      aria-label={`Remove ${s}`}
                      onClick={() =>
                        set(
                          "items",
                          f.items.filter((x) => x !== s),
                        )
                      }
                    >
                      ✕
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => setPicker("items")}
                  className="rounded-lg border border-dashed border-border px-2 py-0.5 text-[11.5px]"
                >
                  + Add
                </button>
              </div>
            </Card>
          )}

          {hasReward && (
            <Card
              title={isBogo ? "Buy X get Y" : "Reward product"}
              hint={
                isBogo ? "What the customer buys and what they get." : "The gift added to the cart."
              }
            >
              <div className="grid gap-3.5 sm:grid-cols-2">
                {isBogo && (
                  <>
                    <Field label="Buy product" req>
                      <button
                        type="button"
                        onClick={() => setPicker("buy")}
                        className={cn(
                          inputCls,
                          "text-left",
                          !f.buyProduct && "text-muted-foreground",
                        )}
                      >
                        {f.buyProduct || "Choose product…"}
                      </button>
                    </Field>
                    <Field label="Buy quantity">
                      <input
                        value={f.buyQty}
                        onChange={(e) => set("buyQty", digits(e.target.value))}
                        className={inputCls}
                      />
                    </Field>
                  </>
                )}
                <Field label={isBogo ? "Get product" : "Reward product"} req>
                  <button
                    type="button"
                    onClick={() => setPicker("get")}
                    className={cn(inputCls, "text-left", !f.getProduct && "text-muted-foreground")}
                  >
                    {f.getProduct || "Choose product…"}
                  </button>
                </Field>
                <Field label="Get quantity">
                  <input
                    value={f.getQty}
                    onChange={(e) => set("getQty", digits(e.target.value))}
                    className={inputCls}
                  />
                </Field>
              </div>
              <Field label="Reward">
                <Choice
                  value={f.buyGetType}
                  onChange={(v) => set("buyGetType", v)}
                  options={[
                    {
                      value: "free",
                      label: "100% free",
                      hint: "Customer receives the reward free",
                    },
                    {
                      value: "discount",
                      label: "Discounted %",
                      hint: "A percentage off the reward",
                    },
                  ]}
                />
              </Field>
              {f.buyGetType === "discount" && (
                <div className="max-w-[200px]">
                  <Field label="Discount on reward (%)">
                    <input
                      value={f.bogoPct}
                      onChange={(e) => set("bogoPct", digits(e.target.value))}
                      className={inputCls}
                    />
                  </Field>
                </div>
              )}
            </Card>
          )}

          <Card title="Schedule & limits">
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field label="Starts">
                <input
                  type="date"
                  value={f.starts}
                  onChange={(e) => set("starts", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Ends" hint="Empty dates = always active">
                <input
                  type="date"
                  value={f.ends}
                  min={f.starts}
                  onChange={(e) => set("ends", e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
            {f.type === "coupon" && (
              <>
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <Field label="Total uses" hint="Empty = unlimited">
                    <input
                      value={f.usageLimit}
                      onChange={(e) => set("usageLimit", digits(e.target.value))}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Uses per customer" hint="Empty = unlimited">
                    <input
                      value={f.perUser}
                      onChange={(e) => set("perUser", digits(e.target.value))}
                      className={inputCls}
                    />
                  </Field>
                </div>
                <Row
                  label="New customers only"
                  hint="Only for a customer's first order"
                  on={f.newUsers}
                  onChange={() => set("newUsers", !f.newUsers)}
                />
                <Row
                  label="Show on website"
                  hint="List the code on the storefront offers page"
                  on={f.showInWebsite}
                  onChange={() => set("showInWebsite", !f.showInWebsite)}
                />
              </>
            )}
          </Card>
        </div>

        <div className="min-w-0">
          <Card title="Summary">
            <ul className="mb-3 space-y-2 text-[13px]">
              <li>
                <span className={`rounded px-2 py-0.5 text-[11.5px] ${meta.badge}`}>
                  {meta.label}
                </span>
              </li>
              {f.type === "coupon" && <li>— Code {f.code || "…"}</li>}
              <li>— {benefit(f)}</li>
              <li>— {appliesTo(f)}</li>
              {(f.type === "coupon" || f.type === "cartDiscount") && (
                <li>— Min. cart {f.min ? `${f.min} EGP` : "—"}</li>
              )}
              <li>— {datesLabel(f.starts, f.ends)}</li>
              <li>— Enquiry-only items excluded</li>
            </ul>
            <Row
              label="Active"
              hint="Switch off to pause without deleting"
              on={f.active}
              onChange={() => set("active", !f.active)}
            />
            <div className="mt-2">
              <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            </div>
            {!isNew && f.type === "coupon" && (
              <p className="mt-3 text-[12px] text-muted-foreground">
                Used {f.used} time{f.used === 1 ? "" : "s"}
                {f.usageLimit ? ` of ${f.usageLimit}` : ""}.
              </p>
            )}
          </Card>
          {!isNew && (
            <section className="rounded-[10px] border border-bad-bg bg-surface px-5 pb-5 pt-4">
              <h3 className="mb-3 text-[15px] text-bad">Delete promotion</h3>
              <p className="mb-3 text-[13px]">
                Orders that already used it keep their discount. To stop it without deleting, switch
                it to inactive.
              </p>
              <Button onClick={() => setAskDelete(true)}>Delete promotion</Button>
            </section>
          )}
        </div>
      </div>

      <Dialog
        open={picker !== null}
        onOpenChange={(o) => {
          if (!o) {
            setPicker(null);
            setQ("");
          }
        }}
      >
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-head text-[18px] font-normal">{pickerTitle}</DialogTitle>
          </DialogHeader>
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className={inputCls}
          />
          <div className="max-h-[300px] overflow-auto rounded-lg border border-border">
            {pickerOptions
              .filter(
                (o) =>
                  (picker !== "items" || !f.items.includes(o)) &&
                  (!q || o.toLowerCase().includes(q.toLowerCase())),
              )
              .slice(0, 40)
              .map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => {
                    if (picker === "items") set("items", [...f.items, o]);
                    else {
                      set(picker === "buy" ? "buyProduct" : "getProduct", o);
                      setPicker(null);
                    }
                    setQ("");
                  }}
                  className="block w-full border-b border-line-soft px-3 py-2 text-left text-[13px] last:border-b-0 hover:bg-hover"
                >
                  {o}
                </button>
              ))}
          </div>
          <DialogFooter>
            <Button
              primary
              onClick={() => {
                setPicker(null);
                setQ("");
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={askDelete} onOpenChange={setAskDelete}>
        <DialogContent className="max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="font-head text-[18px] font-normal">
              Delete {p?.name}?
            </DialogTitle>
          </DialogHeader>
          <p className="text-[13.5px]">The promotion stops applying straight away.</p>
          <DialogFooter>
            <Button onClick={() => setAskDelete(false)}>Cancel</Button>
            <Button
              primary
              onClick={() => {
                if (p) {
                  deletePromotion(p.id);
                  toast(`${p.name} deleted`);
                }
                navigate({ to: "/discounts" });
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
