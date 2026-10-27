import { useReducer, useState, type ReactNode } from "react";
import { OwnerOnly } from "@/components/admin/OwnerOnly";
import { useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { deliveryQuery } from "@/lib/api/sections.functions";
import type { CourierName, ZoneArea, ZoneRow } from "@/lib/api/section-types";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { StatusBadge, Toggle } from "@/components/admin/primitives";
import {
  Button,
  Card,
  DataTable,
  FilterBar,
  FilterSelect,
  PageHeader,
  SearchInput,
  type Column,
} from "@/components/admin/page";
import { SearchSelect } from "@/components/admin/SearchSelect";
import {
  SETTINGS,
  addZone,
  areaOwner,
  arrives,
  bumpDelivery,
  deleteZone,
  editZone,
  useDeliverySettings,
  useZones,
  zoneNameTaken,
  type Bi,
  type Courier,
} from "@/components/admin/DeliveryFlow";
import { BiField, Fld, TouchCtx, useDone } from "@/components/admin/SiteContentUi";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const inputCls =
  "h-9 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-[14px] outline-none focus:border-primary [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";
const COURIER_NAMES: CourierName[] = ["Bosta", "Aramex"];
const yes = (b: boolean) =>
  b ? <StatusBadge tone="ok">Yes</StatusBadge> : <StatusBadge tone="mute">No</StatusBadge>;

const TABS = [
  ["zones", "Zones"],
  ["areas", "Areas"],
  ["couriers", "Couriers"],
  ["options", "Delivery options"],
] as const;
type Tab = (typeof TABS)[number][0];

const Switch = ({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) => (
  <Toggle on={on} onChange={onChange} label={label} />
);

/** Row with a title, small grey line and a switch on the right. */
function SwitchLine({
  title,
  hint,
  on,
  onChange,
}: {
  title: ReactNode;
  hint?: string;
  on: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-line-soft py-3">
      <div>
        <div className="text-[13.5px]">{title}</div>
        {hint && (
          <div className="mt-0.5 max-w-[480px] text-[12px] text-muted-foreground">{hint}</div>
        )}
      </div>
      <Switch on={on} onChange={onChange} label={String(title)} />
    </div>
  );
}

/* ---------- zone form ---------- */
interface ZoneDraft {
  id: string | null;
  name: Bi;
  areas: Bi[];
  fee: string;
  free: string;
  from: string;
  to: string;
  cod: boolean;
  on: boolean;
  courier: CourierName;
}
const blankDraft = (): ZoneDraft => ({
  id: null,
  name: ["", ""],
  areas: [],
  fee: "",
  free: "",
  from: "3",
  to: "4",
  cod: true,
  on: true,
  courier: "Bosta",
});
const draftOf = (z: ZoneRow): ZoneDraft => ({
  id: z.id,
  name: [z.name, z.nameAr],
  areas: z.areas.map((a) => [a.en, a.ar]),
  fee: String(z.fee),
  free: z.free == null ? "" : String(z.free),
  from: String(z.etaFrom),
  to: String(z.etaTo),
  cod: z.cod,
  on: z.on,
  courier: z.courier,
});

function ZoneDialog({
  start,
  zones,
  onClose,
  done,
}: {
  start: ZoneDraft;
  zones: ZoneRow[];
  onClose: () => void;
  done: (t: string, l: string) => void;
}) {
  const [z] = useState<ZoneDraft>(start);
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const [text, setText] = useState("");
  useDeliverySettings();

  const addAreas = () => {
    const names = text
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const msgs: string[] = [];
    for (const n of names) {
      if (z.areas.some((a) => a[0].trim().toLowerCase() === n.toLowerCase())) {
        msgs.push(`${n} is already in this zone`);
        continue;
      }
      const owner = areaOwner(zones, n, z.id ?? undefined);
      if (owner) {
        msgs.push(`${n} is already in ${owner.name}`);
        continue;
      }
      z.areas.push([n, ""]);
    }
    setText("");
    refresh();
    if (msgs.length) toast(msgs.join(" · "));
  };

  const save = () => {
    const [name, nameAr] = [z.name[0].trim(), z.name[1].trim()];
    const fee = Number(z.fee);
    const from = Number(z.from);
    const to = Number(z.to);
    if (!name || !nameAr) return void toast("Add the zone name in English and Arabic");
    if (zoneNameTaken(zones, name, z.id ?? undefined))
      return void toast(`A zone called "${name}" already exists`);
    if (!z.areas.length) return void toast("Add at least one area to this zone");
    if (z.areas.some((a) => !a[1].trim())) return void toast("Add the Arabic name of every area");
    if (z.fee.trim() === "" || Number.isNaN(fee)) return void toast("Add the fee");
    if (!from || !to || to < from)
      return void toast('"Arrives in" — the second number must not be smaller than the first');
    const row = {
      name,
      nameAr,
      areas: z.areas.map((a): ZoneArea => ({ en: a[0].trim(), ar: a[1].trim() })),
      fee,
      free: z.free.trim() === "" ? null : Number(z.free),
      etaFrom: from,
      etaTo: to,
      cod: z.cod,
      on: z.on,
      courier: z.courier,
    };
    if (z.id) editZone(z.id, row);
    else addZone({ id: `Z${Date.now()}`, ...row });
    onClose();
    done("Zone saved", `${name} · ${fee} EGP · ${arrives({ etaFrom: from, etaTo: to })}.`);
  };

  return (
    <TouchCtx.Provider value={refresh}>
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-h-[90vh] max-w-[720px] overflow-auto">
          <DialogHeader>
            <DialogTitle className="font-head text-[18px] font-normal">
              {z.id ? "Edit zone" : "Add zone"}
            </DialogTitle>
          </DialogHeader>
          <BiField label="Zone name *" labelAr="اسم المنطقة *" v={z.name} />
          <Fld
            label="Areas in this zone *"
            hint="Each area needs its English and Arabic name. Paste several separated by commas. An area already in another zone can't be added."
          >
            <div className="flex gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addAreas();
                  }
                }}
                placeholder="e.g. Maadi, Zamalek"
                className={inputCls}
              />
              <Button onClick={addAreas}>Add</Button>
            </div>
          </Fld>
          <div className="mt-2.5 flex max-h-[220px] flex-col gap-2 overflow-auto">
            {z.areas.map((a, k) => (
              <div key={k} className="grid grid-cols-[1fr_1fr_24px] items-center gap-2">
                <input
                  value={a[0]}
                  onChange={(e) => {
                    a[0] = e.target.value;
                    refresh();
                  }}
                  className={inputCls}
                />
                <input
                  dir="rtl"
                  value={a[1]}
                  placeholder="الاسم بالعربي"
                  onChange={(e) => {
                    a[1] = e.target.value;
                    refresh();
                  }}
                  className={cn(inputCls, "text-right", !a[1].trim() && "border-bad bg-[#fff8f7]")}
                />
                <button
                  type="button"
                  aria-label={`Remove ${a[0]}`}
                  className="text-muted-foreground hover:text-bad"
                  onClick={() => {
                    z.areas.splice(k, 1);
                    refresh();
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
            {!z.areas.length && (
              <p className="text-[12.5px] text-muted-foreground">No areas yet.</p>
            )}
          </div>
          <div className="mt-4 grid gap-3.5 sm:grid-cols-3">
            <Fld label="Fee (EGP) *">
              <input
                type="number"
                value={z.fee}
                onChange={(e) => {
                  z.fee = e.target.value;
                  refresh();
                }}
                className={inputCls}
              />
            </Fld>
            <Fld label="Free over (EGP)" hint="Leave empty for no free delivery">
              <input
                type="number"
                value={z.free}
                onChange={(e) => {
                  z.free = e.target.value;
                  refresh();
                }}
                className={inputCls}
              />
            </Fld>
            <Fld label="Arrives in">
              <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <input
                  type="number"
                  value={z.from}
                  onChange={(e) => {
                    z.from = e.target.value;
                    refresh();
                  }}
                  className={cn(inputCls, "w-16")}
                />
                to
                <input
                  type="number"
                  value={z.to}
                  onChange={(e) => {
                    z.to = e.target.value;
                    refresh();
                  }}
                  className={cn(inputCls, "w-16")}
                />
                <span className="whitespace-nowrap">working days</span>
              </div>
            </Fld>
          </div>
          <Fld label="Courier for this zone" className="mt-4">
            <div className="inline-flex w-fit rounded-full border border-border p-0.5">
              {COURIER_NAMES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    z.courier = c;
                    refresh();
                  }}
                  className={cn(
                    "h-[26px] rounded-full px-3 text-[12.5px]",
                    z.courier === c
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {c}
                  {SETTINGS.couriers[c].on ? "" : " · not connected"}
                </button>
              ))}
            </div>
          </Fld>
          <div className="mt-2">
            <SwitchLine
              title="Cash on delivery allowed"
              on={z.cod}
              onChange={() => {
                z.cod = !z.cod;
                refresh();
              }}
            />
            <SwitchLine
              title="Zone active"
              hint={`Off = customers here see the "we don't deliver to your area" message. Fee and areas stay saved.`}
              on={z.on}
              onChange={() => {
                z.on = !z.on;
                refresh();
              }}
            />
          </div>
          <DialogFooter>
            <Button onClick={onClose}>Cancel</Button>
            <Button primary onClick={save}>
              Save zone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TouchCtx.Provider>
  );
}

/* ---------- courier form ---------- */
function CourierDialog({
  name,
  onClose,
  done,
}: {
  name: CourierName;
  onClose: () => void;
  done: (t: string, l: string) => void;
}) {
  const [k, setK] = useState<Courier>({ ...SETTINGS.couriers[name] });
  const [test, setTest] = useState<{ ok: boolean; msg: string } | null>(null);
  const was = SETTINGS.couriers[name].on;
  const set = (p: Partial<Courier>) => {
    setK({ ...k, ...p });
    setTest(null);
  };
  const filled = name === "Bosta" ? !!k.key : !!(k.acc && k.user && k.pass && k.pin);
  const field = (label: string, key: keyof Courier, type = "text", ph = "") => (
    <Fld label={label}>
      <input
        type={type}
        placeholder={ph}
        value={String(k[key])}
        onChange={(e) => set({ [key]: e.target.value } as Partial<Courier>)}
        className={inputCls}
      />
    </Fld>
  );
  const save = () => {
    if (!filled) return void toast("Fill in all the account details first");
    (Object.keys(SETTINGS.couriers) as CourierName[]).forEach((c) => {
      if (k.def && c !== name) SETTINGS.couriers[c].def = false;
    });
    SETTINGS.couriers[name] = { ...k, on: true };
    // exactly one default courier
    if (!COURIER_NAMES.some((c) => SETTINGS.couriers[c].def)) SETTINGS.couriers.Bosta.def = true;
    bumpDelivery();
    onClose();
    done(
      was ? `${name} settings saved` : `${name} connected`,
      was ? "Your changes are saved." : `${name} is connected. Choose it on a zone to use it.`,
    );
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-[640px] overflow-auto">
        <DialogHeader>
          <DialogTitle className="font-head text-[18px] font-normal">
            {was ? `${name} settings` : `Connect ${name}`}
          </DialogTitle>
        </DialogHeader>
        <p className="text-[13.5px]">
          {was
            ? `Change how ${name} works with your orders.`
            : `Enter the account details from your ${name} business account. You get them from ${name} when the account is opened.`}
        </p>
        <div className="grid gap-3.5 sm:grid-cols-2">
          {name === "Bosta" ? (
            field("API key", "key", "password", "From your Bosta business dashboard")
          ) : (
            <>
              {field("Account number", "acc")}
              {field("Account PIN", "pin", "password")}
              {field("Username", "user")}
              {field("Password", "pass", "password")}
            </>
          )}
        </div>
        {field("Pickup address", "pick")}
        <div>
          <SwitchLine
            title="Default courier for new orders"
            hint="Only one courier can be the default."
            on={k.def}
            onChange={() => set({ def: !k.def })}
          />
          <SwitchLine
            title="Create the shipment automatically"
            hint='When an order is marked "Ready to ship"'
            on={k.auto}
            onChange={() => set({ auto: !k.auto })}
          />
          <SwitchLine
            title="Send tracking SMS to the customer"
            on={k.sms}
            onChange={() => set({ sms: !k.sms })}
          />
        </div>
        {test && (
          <p className={cn("text-[13px]", test.ok ? "text-good" : "text-warn")}>{test.msg}</p>
        )}
        <DialogFooter className="sm:justify-between">
          <Button
            onClick={() =>
              setTest(
                filled
                  ? { ok: true, msg: `Connection works — ${name} answered.` }
                  : { ok: false, msg: "Fill in all the account details first." },
              )
            }
          >
            Test connection
          </Button>
          <span className="flex gap-2">
            <Button onClick={onClose}>Cancel</Button>
            <Button primary onClick={save}>
              {was ? "Save settings" : `Connect ${name}`}
            </Button>
          </span>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const nid = () => `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export default function DeliveryPage() {
  const { data } = useSuspenseQuery(deliveryQuery());
  const zones = useZones(data.zones);
  useDeliverySettings();
  const [doneNode, done] = useDone();
  const [tab, setTab] = useState<Tab>("zones");
  const [zf, setZf] = useState<ZoneDraft | null>(null);
  const [delZone, setDelZone] = useState<ZoneRow | null>(null);
  const [courier, setCourier] = useState<CourierName | null>(null);
  const [q, setQ] = useState("");
  const [zoneFilter, setZoneFilter] = useState("");
  const [af, setAf] = useState<{
    old: ZoneArea | null;
    oldZone: string;
    name: Bi;
    zoneId: string;
  } | null>(null);
  const [delArea, setDelArea] = useState<{ area: ZoneArea; zone: ZoneRow } | null>(null);
  const [, refresh] = useReducer((n: number) => n + 1, 0);

  const onCount = zones.filter((z) => z.on).length;
  const zoneById = (id: string) => zones.find((z) => z.id === id);

  /* ---------- zones ---------- */
  const toggleZone = (z: ZoneRow) => {
    editZone(z.id, { on: !z.on });
    done(
      z.on ? `${z.name} switched off` : `${z.name} switched on`,
      z.on
        ? 'Customers in its areas now see the "we don\'t deliver to your area" message at checkout. The fee and areas are kept.'
        : "Customers in its areas can order with delivery again.",
    );
  };
  const zoneCols: Column<ZoneRow>[] = [
    {
      header: "Zone",
      cell: (z) => (
        <div>
          <b className="font-medium">{z.name}</b>
          <div dir="rtl" className="text-left text-[12px] text-muted-foreground">
            {z.nameAr}
          </div>
          <div className="text-[12px] text-muted-foreground">Courier: {z.courier}</div>
        </div>
      ),
    },
    {
      header: "Areas",
      cell: (z) => (
        <div className="flex max-w-[360px] flex-wrap gap-1">
          {z.areas.map((a) => (
            <span key={a.en} className="rounded-full bg-muted px-2 py-0.5 text-[11.5px]">
              {a.en}
            </span>
          ))}
        </div>
      ),
    },
    { header: "Fee", cell: (z) => formatMoney(z.fee) },
    { header: "Free over", cell: (z) => (z.free == null ? "—" : formatMoney(z.free)) },
    { header: "Arrives", cell: (z) => arrives(z) },
    { header: "Cash on delivery", cell: (z) => yes(z.cod) },
    {
      header: "On site",
      cell: (z) => <Switch on={z.on} onChange={() => toggleZone(z)} label={`${z.name} on site`} />,
    },
    {
      header: "actions",
      headerNode: "",
      align: "right",
      cell: (z) => (
        <div className="flex justify-end gap-2">
          <Button onClick={() => setZf(draftOf(z))}>Edit</Button>
          <OwnerOnly>
            <Button onClick={() => setDelZone(z)}>Delete</Button>
          </OwnerOnly>
        </div>
      ),
    },
  ];

  /* ---------- areas ---------- */
  type AreaRow = { area: ZoneArea; zone: ZoneRow };
  const allAreas: AreaRow[] = zones
    .flatMap((z) => z.areas.map((area) => ({ area, zone: z })))
    .sort((a, b) => a.area.en.localeCompare(b.area.en));
  const areaRows = allAreas.filter(
    (r) =>
      (!q || `${r.area.en} ${r.area.ar}`.toLowerCase().includes(q.toLowerCase())) &&
      (!zoneFilter || r.zone.name === zoneFilter),
  );
  const saveArea = () => {
    if (!af) return;
    const [en, ar] = [af.name[0].trim(), af.name[1].trim()];
    if (!en || !ar) return void toast("Add the area name in English and Arabic");
    const target = zoneById(af.zoneId);
    if (!target) return void toast("Choose a zone");
    const owner = areaOwner(zones, en);
    const same = af.old && af.old.en.toLowerCase() === en.toLowerCase();
    if (owner && !same) return void toast(`${en} is already in ${owner.name}`);
    if (af.old) {
      const from = zoneById(af.oldZone)!;
      if (from.id === target.id)
        editZone(from.id, { areas: from.areas.map((a) => (a === af.old ? { en, ar } : a)) });
      else {
        editZone(from.id, { areas: from.areas.filter((a) => a !== af.old) });
        editZone(target.id, { areas: [...target.areas, { en, ar }] });
      }
    } else editZone(target.id, { areas: [...target.areas, { en, ar }] });
    setAf(null);
    done("Area saved", `${en} is in ${target.name}.`);
  };
  const areaCols: Column<AreaRow>[] = [
    {
      header: "Area",
      cell: (r) => (
        <div>
          <b className="font-medium">{r.area.en}</b>
          <div dir="rtl" className="text-left text-[12px] text-muted-foreground">
            {r.area.ar || <span className="text-warn">No Arabic name</span>}
          </div>
        </div>
      ),
    },
    { header: "Zone", cell: (r) => r.zone.name },
    { header: "Fee", cell: (r) => formatMoney(r.zone.fee) },
    { header: "Arrives", cell: (r) => arrives(r.zone) },
    {
      header: "On site",
      cell: (r) =>
        r.zone.on ? (
          <StatusBadge tone="ok">Yes</StatusBadge>
        ) : (
          <StatusBadge tone="mute">Zone off</StatusBadge>
        ),
    },
    {
      header: "actions",
      headerNode: "",
      align: "right",
      cell: (r) => (
        <div className="flex justify-end gap-2">
          <Button
            onClick={() =>
              setAf({
                old: r.area,
                oldZone: r.zone.id,
                name: [r.area.en, r.area.ar],
                zoneId: r.zone.id,
              })
            }
          >
            Edit
          </Button>
          <OwnerOnly>
            <Button onClick={() => setDelArea(r)}>Delete</Button>
          </OwnerOnly>
        </div>
      ),
    },
  ];
  const afZone = af ? zoneById(af.zoneId) : undefined;
  /** Greys out a switched-off zone's row, but never its Edit / Delete buttons. */
  const dimWhenOff = <T,>(cols: Column<T>[], isOff: (r: T) => boolean): Column<T>[] =>
    cols.map((c) =>
      c.header === "actions"
        ? c
        : {
            ...c,
            cell: (r: T) => (isOff(r) ? <div className="opacity-55">{c.cell(r)}</div> : c.cell(r)),
          },
    );

  /* ---------- options ---------- */
  const { sameDay, store, cod } = SETTINGS;
  const pill = (on: boolean, label = "On the site") =>
    on ? <StatusBadge tone="ok">{label}</StatusBadge> : <StatusBadge tone="mute">Off</StatusBadge>;

  return (
    <TouchCtx.Provider
      value={() => {
        bumpDelivery();
        refresh();
      }}
    >
      <PageHeader
        title="Delivery"
        subtitle="Delivery zones and the areas in each. An area belongs to one zone only, so every address has one fee."
        actions={
          tab === "zones" ? (
            <Button primary onClick={() => setZf(blankDraft())}>
              + Add zone
            </Button>
          ) : tab === "areas" ? (
            <Button
              primary
              onClick={() =>
                setAf({ old: null, oldZone: "", name: ["", ""], zoneId: zones[0]?.id ?? "" })
              }
            >
              + Add area
            </Button>
          ) : undefined
        }
      />
      <div className="mb-[18px] flex gap-1 overflow-x-auto overflow-y-hidden border-b border-border pb-px">
        {TABS.map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[13px]",
              k === tab
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground",
            )}
          >
            {label}
            {k === "zones"
              ? ` · ${zones.length}`
              : k === "areas"
                ? ` · ${allAreas.length}`
                : k === "couriers"
                  ? " · 2"
                  : ""}
          </button>
        ))}
      </div>

      {tab === "zones" && (
        <>
          <Card>
            <h3 className="mb-1 text-[15px]">Message for areas we don't deliver to</h3>
            <p className="mb-3 text-[12px] text-muted-foreground">
              Shown at checkout when the customer's area is switched off or not listed. They cannot
              complete the order with delivery.
            </p>
            <BiField label="Message" labelAr="الرسالة" v={SETTINGS.noMsg} rows={2} />
            <Button
              onClick={() =>
                done(
                  "Message saved",
                  "Customers outside your zones now see this message at checkout.",
                )
              }
            >
              Save message
            </Button>
          </Card>
          <Card>
            <p className="mb-3 text-[12.5px] text-muted-foreground">
              {onCount} of {zones.length} zones are on the site. Switch a zone off to stop
              delivering there — its fee and areas stay saved.
            </p>
            <DataTable
              columns={dimWhenOff(zoneCols, (z) => !z.on)}
              rows={zones}
              rowKey={(z) => z.id}
              empty="No zones yet"
            />
          </Card>
        </>
      )}
      {tab === "areas" && (
        <Card>
          <FilterBar>
            <SearchInput value={q} onChange={setQ} placeholder="Search areas" />
            <FilterSelect
              value={zoneFilter}
              onChange={setZoneFilter}
              all="All zones"
              options={zones.map((z) => z.name)}
            />
          </FilterBar>
          <DataTable
            columns={dimWhenOff(areaCols, (r) => !r.zone.on)}
            rows={areaRows}
            rowKey={(r) => r.area.en}
            empty="No area matches"
          />
          <p className="mt-3 text-[12.5px] text-muted-foreground">
            Fee and delivery time come from the zone. To change them, edit the zone.
          </p>
        </Card>
      )}
      {tab === "couriers" && (
        <>
          <div className="grid gap-[18px] md:grid-cols-2">
            {COURIER_NAMES.map((c) => {
              const k = SETTINGS.couriers[c];
              const used = zones.filter((z) => z.courier === c).map((z) => z.name);
              return (
                <Card key={c} className="mb-0">
                  <h3 className="mb-3 text-[15px]">{c}</h3>
                  <dl className="divide-y divide-line-soft text-[13px]">
                    {(
                      [
                        [
                          "Status",
                          k.on ? (
                            <StatusBadge tone="ok">Connected</StatusBadge>
                          ) : (
                            <StatusBadge tone="mute">Not connected</StatusBadge>
                          ),
                        ],
                        [
                          "Use for",
                          k.def ? "Default for new orders" : "Second option · choose per order",
                        ],
                        ["Zones", used.length ? used.join(", ") : "—"],
                        ["Pickup address", k.pick],
                        [
                          "Auto-create shipment",
                          k.on
                            ? k.auto
                              ? 'When order is "Ready to ship"'
                              : "Off"
                            : "Starts once connected",
                        ],
                        [
                          "Tracking SMS to customer",
                          k.on ? (k.sms ? "On" : "Off") : "Starts once connected",
                        ],
                      ] as [string, ReactNode][]
                    ).map(([a, v]) => (
                      <div key={a} className="flex justify-between gap-4 py-2.5">
                        <dt className="text-muted-foreground">{a}</dt>
                        <dd className="text-right">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-4">
                    {k.on ? (
                      <Button onClick={() => setCourier(c)}>Edit settings</Button>
                    ) : (
                      <Button primary onClick={() => setCourier(c)}>
                        Connect {c}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
          <p className="mt-4 text-[12.5px] text-muted-foreground">
            When an order is marked "Ready to ship", the shipment is created at the courier
            automatically. The tracking number comes back into the order, the customer gets a
            tracking link, and updates such as "Picked up", "Out for delivery", "Delivered" and
            "Returned" appear in the order by themselves.
          </p>
        </>
      )}
      {tab === "options" && (
        <>
          <Card>
            <h3 className="mb-1 flex items-center justify-between text-[15px]">
              Same-day delivery
              <span className="flex items-center gap-2.5">
                {pill(sameDay.on)}
                <Switch
                  on={sameDay.on}
                  label="Same-day delivery"
                  onChange={() => {
                    sameDay.on = !sameDay.on;
                    refresh();
                  }}
                />
              </span>
            </h3>
            <p className="mb-4 text-[12px] text-muted-foreground">
              An extra choice at checkout, next to standard delivery, for customers in the zones you
              pick. Switch it off any time — the settings stay saved.
            </p>
            <div className="grid max-w-[640px] gap-3.5 sm:grid-cols-3">
              <Fld label="Fee (EGP)">
                <input
                  type="number"
                  value={sameDay.fee}
                  onChange={(e) => {
                    sameDay.fee = e.target.value;
                    refresh();
                  }}
                  className={inputCls}
                />
              </Fld>
              <Fld label="Order before" hint="After this time, it shows next working day">
                <input
                  type="time"
                  value={sameDay.cut}
                  onChange={(e) => {
                    sameDay.cut = e.target.value;
                    refresh();
                  }}
                  className={inputCls}
                />
              </Fld>
            </div>
            <Fld label="Available in" className="mt-4">
              <div className="flex flex-wrap gap-2.5">
                {zones.map((z) => (
                  <label
                    key={z.id}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-[13px]",
                      !z.on && "opacity-55",
                    )}
                  >
                    <input
                      type="checkbox"
                      disabled={!z.on}
                      checked={sameDay.zones.includes(z.id)}
                      onChange={(e) => {
                        sameDay.zones = e.target.checked
                          ? [...sameDay.zones, z.id]
                          : sameDay.zones.filter((x) => x !== z.id);
                        refresh();
                      }}
                      className="accent-black"
                    />
                    {z.name}
                    {z.on ? "" : " · zone off"}
                  </label>
                ))}
              </div>
            </Fld>
            <div className="mt-4">
              <BiField label="Name at checkout" labelAr="الاسم عند الدفع" v={sameDay.lab} />
              <BiField label="Line under it" labelAr="السطر تحته" v={sameDay.note} />
            </div>
          </Card>

          <Card>
            <h3 className="mb-1 flex items-center justify-between text-[15px]">
              Collect from store
              <span className="flex items-center gap-2.5">
                {pill(store.on)}
                <span className={cn(!store.stores.length && "opacity-40")}>
                  <Switch
                    on={store.on}
                    label="Collect from store"
                    onChange={() => {
                      if (!store.stores.length) return void toast("Add a store first");
                      store.on = !store.on;
                      refresh();
                    }}
                  />
                </span>
              </span>
            </h3>
            <p className="mb-4 text-[12px] text-muted-foreground">
              Customers choose a store at checkout and collect their order there, with no delivery
              fee. Ready for when Zelliny opens a store — it can't be switched on until a store is
              added.
            </p>
            {store.stores.map((s, i) => (
              <div key={s.id} className="mb-3 rounded-[10px] border border-border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <b className="text-[13.5px] font-medium">Store {i + 1}</b>
                  <button
                    type="button"
                    aria-label={`Remove store ${i + 1}`}
                    className="text-muted-foreground hover:text-bad"
                    onClick={() => {
                      store.stores = store.stores.filter((x) => x !== s);
                      if (!store.stores.length) store.on = false;
                      refresh();
                    }}
                  >
                    ✕
                  </button>
                </div>
                <BiField label="Store name" labelAr="اسم المتجر" v={s.n} />
                <BiField label="Address" labelAr="العنوان" v={s.ad} />
                <BiField label="Opening hours" labelAr="مواعيد العمل" v={s.h} />
                <Fld label="Ready to collect after" className="max-w-[260px]">
                  <input
                    value={s.r}
                    onChange={(e) => {
                      s.r = e.target.value;
                      refresh();
                    }}
                    className={inputCls}
                  />
                </Fld>
              </div>
            ))}
            {!store.stores.length && (
              <p className="mb-3 text-[12.5px] text-muted-foreground">No stores yet.</p>
            )}
            <Button
              onClick={() => {
                store.stores.push({
                  id: nid(),
                  n: ["", ""],
                  ad: ["", ""],
                  h: ["", ""],
                  r: "1 working day",
                });
                refresh();
              }}
            >
              + Add store
            </Button>
          </Card>

          <Card>
            <h3 className="mb-1 flex items-center justify-between text-[15px]">
              Cash on delivery limit
              <span className="flex items-center gap-2.5">
                {pill(cod.on, "On")}
                <Switch
                  on={cod.on}
                  label="Cash on delivery limit"
                  onChange={() => {
                    cod.on = !cod.on;
                    refresh();
                  }}
                />
              </span>
            </h3>
            <p className="mb-4 text-[12px] text-muted-foreground">
              When on, orders above this total can't be paid in cash on delivery — only by card.
              Based on the order total, for every zone. Off = no limit.
            </p>
            <Fld label="No cash on delivery above (EGP)" className="max-w-[300px]">
              <input
                type="number"
                value={cod.max}
                onChange={(e) => {
                  cod.max = e.target.value;
                  refresh();
                }}
                className={inputCls}
              />
            </Fld>
            <div className="mt-4">
              <BiField
                label="Message at checkout"
                labelAr="الرسالة عند الدفع"
                v={cod.msg}
                rows={2}
              />
            </div>
          </Card>
          <Button
            primary
            onClick={() => done("Delivery options saved", "Your changes are now live at checkout.")}
          >
            Save delivery options
          </Button>
        </>
      )}

      {zf && <ZoneDialog start={zf} zones={zones} onClose={() => setZf(null)} done={done} />}
      {courier && <CourierDialog name={courier} onClose={() => setCourier(null)} done={done} />}

      <Dialog open={!!delZone} onOpenChange={(o) => !o && setDelZone(null)}>
        <DialogContent className="max-w-[520px]">
          {delZone && delZone.areas.length > 0 ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-head text-[18px] font-normal">
                  {delZone.name} can't be deleted yet
                </DialogTitle>
              </DialogHeader>
              <p className="text-[13.5px]">
                It still has {delZone.areas.length} area{delZone.areas.length > 1 ? "s" : ""} (
                {delZone.areas.map((a) => a.en).join(", ")}). Move{" "}
                {delZone.areas.length > 1 ? "them" : "it"} to another zone first, or remove{" "}
                {delZone.areas.length > 1 ? "them" : "it"}, so no customer is left without a fee.
              </p>
              <p className="text-[13px] text-muted-foreground">
                To stop delivering there for now, switch the zone off instead.
              </p>
              <DialogFooter>
                <Button onClick={() => setDelZone(null)}>Close</Button>
                <Button
                  primary
                  onClick={() => {
                    setZf(draftOf(delZone));
                    setDelZone(null);
                  }}
                >
                  Open zone
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="font-head text-[18px] font-normal">
                  Delete {delZone?.name}?
                </DialogTitle>
              </DialogHeader>
              <p className="text-[13.5px]">It has no areas. It will be removed for good.</p>
              <DialogFooter>
                <Button onClick={() => setDelZone(null)}>Cancel</Button>
                <button
                  type="button"
                  className="h-9 rounded-lg bg-bad px-4 text-[13.5px] text-white"
                  onClick={() => {
                    if (delZone) deleteZone(delZone.id);
                    setDelZone(null);
                    done("Zone deleted", "The zone has been removed.");
                  }}
                >
                  Delete zone
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {af && (
        <Dialog open onOpenChange={(o) => !o && setAf(null)}>
          <DialogContent className="max-w-[560px]">
            <DialogHeader>
              <DialogTitle className="font-head text-[18px] font-normal">
                {af.old ? "Edit area" : "Add area"}
              </DialogTitle>
            </DialogHeader>
            <TouchCtx.Provider value={() => setAf({ ...af })}>
              <BiField label="Area name *" labelAr="اسم المنطقة *" v={af.name} />
            </TouchCtx.Provider>
            <Fld label="Zone">
              <SearchSelect
                value={af.zoneId}
                items={zones.map((z) => ({ value: z.id, label: z.name + (z.on ? "" : " · off") }))}
                onChange={(v) => v && setAf({ ...af, zoneId: v })}
                searchable={false}
                className="text-[14px]"
              />
            </Fld>
            {afZone && (
              <div className="rounded-[10px] bg-[#f7f7f7] px-3.5 py-3 text-[13px] leading-relaxed">
                Fee <b>{formatMoney(afZone.fee)}</b> · arrives in <b>{arrives(afZone)}</b> · free
                over <b>{afZone.free == null ? "—" : formatMoney(afZone.free)}</b>
                <br />
                <span className="text-muted-foreground">
                  Set on the zone —{" "}
                  <button
                    type="button"
                    className="underline underline-offset-[3px]"
                    onClick={() => {
                      setZf(draftOf(afZone));
                      setAf(null);
                    }}
                  >
                    edit {afZone.name}
                  </button>
                </span>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setAf(null)}>Cancel</Button>
              <Button primary onClick={saveArea}>
                Save area
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={!!delArea} onOpenChange={(o) => !o && setDelArea(null)}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-head text-[18px] font-normal">
              Delete {delArea?.area.en}?
            </DialogTitle>
          </DialogHeader>
          <p className="text-[13.5px]">
            Customers in {delArea?.area.en} will see the "we don't deliver to your area" message at
            checkout.
          </p>
          <DialogFooter>
            <Button onClick={() => setDelArea(null)}>Cancel</Button>
            <button
              type="button"
              className="h-9 rounded-lg bg-bad px-4 text-[13.5px] text-white"
              onClick={() => {
                if (delArea) {
                  editZone(delArea.zone.id, {
                    areas: delArea.zone.areas.filter((a) => a !== delArea.area),
                  });
                  done("Area deleted", `${delArea.area.en} has been removed.`);
                }
                setDelArea(null);
              }}
            >
              Delete area
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {doneNode}
    </TouchCtx.Provider>
  );
}
