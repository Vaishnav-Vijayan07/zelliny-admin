import { useState, type ReactNode } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { deliveryQuery } from "@/lib/api/sections.functions";
import type { ZoneRow } from "@/lib/api/section-types";
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
import {
  addZone,
  areaOwner,
  deleteZone,
  editZone,
  useZones,
  zoneNameTaken,
} from "@/components/admin/DeliveryFlow";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const inputCls =
  "h-9 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-[14px] outline-none focus:border-primary";
const yes = (b: boolean) =>
  b ? <StatusBadge tone="ok">Yes</StatusBadge> : <StatusBadge tone="mute">No</StatusBadge>;

function Field({
  label,
  req,
  hint,
  children,
}: {
  label: string;
  req?: boolean;
  hint?: string | undefined;
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

const TABS = ["Zones", "Areas"] as const;
type Tab = (typeof TABS)[number];

type ZoneForm = {
  id: string | null;
  name: string;
  areas: string[];
  fee: string;
  free: string;
  eta: string;
  cod: boolean;
};
const blank: ZoneForm = {
  id: null,
  name: "",
  areas: [],
  fee: "",
  free: "",
  eta: "1–2 days",
  cod: true,
};

export default function DeliveryPage() {
  const { data } = useSuspenseQuery(deliveryQuery());
  const zones = useZones(data.zones);
  const [tab, setTab] = useState<Tab>("Zones");
  const [zf, setZf] = useState<ZoneForm | null>(null);
  const [areaText, setAreaText] = useState("");
  const [delZone, setDelZone] = useState<ZoneRow | null>(null);
  const [q, setQ] = useState("");
  const [zoneFilter, setZoneFilter] = useState("");
  const [af, setAf] = useState<{ old: string | null; name: string; zoneId: string } | null>(null);
  const [delArea, setDelArea] = useState<{ area: string; zone: ZoneRow } | null>(null);

  /* ---------- zones ---------- */
  const addAreaToForm = () => {
    if (!zf) return;
    const names = areaText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const next = [...zf.areas];
    for (const n of names) {
      if (next.some((a) => a.toLowerCase() === n.toLowerCase())) continue;
      const owner = areaOwner(zones, n, zf.id ?? undefined);
      if (owner) {
        toast(`"${n}" is already in ${owner.name} — an area can only be in one zone`);
        continue;
      }
      next.push(n);
    }
    setZf({ ...zf, areas: next });
    setAreaText("");
  };
  const saveZone = () => {
    if (!zf) return;
    const name = zf.name.trim(),
      fee = parseInt(zf.fee.replace(/\D/g, ""), 10);
    if (!name) {
      toast("Name the zone first");
      return;
    }
    if (zoneNameTaken(zones, name, zf.id ?? undefined)) {
      toast(`A zone called "${name}" already exists`);
      return;
    }
    if (Number.isNaN(fee)) {
      toast("Enter the delivery fee");
      return;
    }
    if (!zf.areas.length) {
      toast("Add at least one area to this zone");
      return;
    }
    const clash = zf.areas
      .map((a) => ({ a, o: areaOwner(zones, a, zf.id ?? undefined) }))
      .find((x) => x.o);
    if (clash) {
      toast(`"${clash.a}" is already in ${clash.o!.name}`);
      return;
    }
    const free = zf.free.trim()
      ? /egp/i.test(zf.free)
        ? zf.free.trim()
        : `${zf.free.trim()} EGP`
      : "—";
    const row = { name, areas: zf.areas, fee, free, eta: zf.eta.trim() || "—", cod: zf.cod };
    if (zf.id) {
      editZone(zf.id, row);
      toast(`${name} saved`);
    } else {
      addZone({ id: `Z${Date.now()}`, ...row });
      toast(`${name} added`);
    }
    setZf(null);
  };
  const openZone = (z: ZoneRow) =>
    setZf({
      id: z.id,
      name: z.name,
      areas: [...z.areas],
      fee: String(z.fee),
      free: z.free === "—" ? "" : z.free,
      eta: z.eta,
      cod: z.cod,
    });

  const zoneCols: Column<ZoneRow>[] = [
    { header: "Zone", cell: (z) => <b className="font-medium">{z.name}</b> },
    {
      header: "Areas",
      cell: (z) => (
        <div className="flex max-w-[360px] flex-wrap gap-1">
          {z.areas.map((a) => (
            <span key={a} className="rounded-full bg-muted px-2 py-0.5 text-[11.5px]">
              {a}
            </span>
          ))}
        </div>
      ),
    },
    { header: "Fee", cell: (z) => formatMoney(z.fee) },
    { header: "Free over", cell: (z) => z.free },
    { header: "Arrives", cell: (z) => z.eta },
    { header: "Cash on delivery", cell: (z) => yes(z.cod) },
    {
      header: "actions",
      headerNode: "",
      align: "right",
      cell: (z) => (
        <div className="flex justify-end gap-2">
          <Button onClick={() => openZone(z)}>Edit</Button>
          <Button onClick={() => setDelZone(z)}>Delete</Button>
        </div>
      ),
    },
  ];

  /* ---------- areas ---------- */
  type AreaRow = { area: string; zone: ZoneRow };
  const allAreas: AreaRow[] = zones
    .flatMap((z) => z.areas.map((area) => ({ area, zone: z })))
    .sort((a, b) => a.area.localeCompare(b.area));
  const areaRows = allAreas.filter(
    (r) =>
      (!q || r.area.toLowerCase().includes(q.toLowerCase())) &&
      (!zoneFilter || r.zone.name === zoneFilter),
  );
  const saveArea = () => {
    if (!af) return;
    const name = af.name.trim();
    if (!name) {
      toast("Enter the area name");
      return;
    }
    const owner = areaOwner(zones, name, af.old ? undefined : undefined);
    const sameOne = af.old && af.old.toLowerCase() === name.toLowerCase();
    if (owner && !sameOne) {
      toast(`"${name}" is already in ${owner.name} — an area can only be in one zone`);
      return;
    }
    const target = zones.find((z) => z.id === af.zoneId);
    if (!target) {
      toast("Choose a zone");
      return;
    }
    if (af.old) {
      const from = zones.find((z) => z.areas.includes(af.old!))!;
      if (from.id === target.id)
        editZone(from.id, { areas: from.areas.map((a) => (a === af.old ? name : a)) });
      else {
        editZone(from.id, { areas: from.areas.filter((a) => a !== af.old) });
        editZone(target.id, { areas: [...target.areas, name] });
      }
      toast(from.id === target.id ? "Area renamed" : `${name} moved to ${target.name}`);
    } else {
      editZone(target.id, { areas: [...target.areas, name] });
      toast(`${name} added to ${target.name}`);
    }
    setAf(null);
  };
  const confirmDelArea = () => {
    if (!delArea) return;
    editZone(delArea.zone.id, { areas: delArea.zone.areas.filter((a) => a !== delArea.area) });
    toast(
      `${delArea.area} removed — customers there can't be delivered to until it is added to a zone`,
    );
    setDelArea(null);
  };
  const areaCols: Column<AreaRow>[] = [
    { header: "Area", cell: (r) => <b className="font-medium">{r.area}</b> },
    { header: "Zone", cell: (r) => r.zone.name },
    { header: "Fee", cell: (r) => formatMoney(r.zone.fee) },
    { header: "Arrives", cell: (r) => r.zone.eta },
    {
      header: "actions",
      headerNode: "",
      align: "right",
      cell: (r) => (
        <div className="flex justify-end gap-2">
          <Button onClick={() => setAf({ old: r.area, name: r.area, zoneId: r.zone.id })}>
            Edit
          </Button>
          <Button onClick={() => setDelArea(r)}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Delivery"
        subtitle="Delivery zones and the areas in each. An area belongs to one zone only, so every address has one fee."
        actions={
          tab === "Zones" ? (
            <Button
              primary
              onClick={() => {
                setZf({ ...blank });
                setAreaText("");
              }}
            >
              + Add zone
            </Button>
          ) : (
            <Button
              primary
              onClick={() => setAf({ old: null, name: "", zoneId: zones[0]?.id ?? "" })}
            >
              + Add area
            </Button>
          )
        }
      />
      <div className="mb-[18px] flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "-mb-px border-b-2 px-3.5 py-2.5 text-[13px]",
              t === tab
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground",
            )}
          >
            {t} · {t === "Zones" ? zones.length : allAreas.length}
          </button>
        ))}
      </div>

      {tab === "Zones" && (
        <Card>
          <DataTable columns={zoneCols} rows={zones} rowKey={(z) => z.id} empty="No zones yet" />
        </Card>
      )}
      {tab === "Areas" && (
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
            columns={areaCols}
            rows={areaRows}
            rowKey={(r) => r.area}
            empty="No area matches"
          />
        </Card>
      )}

      <Dialog open={!!zf} onOpenChange={(o) => !o && setZf(null)}>
        <DialogContent className="max-h-[90vh] max-w-[560px] overflow-auto">
          <DialogHeader>
            <DialogTitle className="font-head text-[18px] font-normal">
              {zf?.id ? "Edit zone" : "Add zone"}
            </DialogTitle>
          </DialogHeader>
          {zf && (
            <>
              <Field label="Zone name" req>
                <input
                  autoFocus
                  value={zf.name}
                  onChange={(e) => setZf({ ...zf, name: e.target.value })}
                  className={inputCls}
                  placeholder="e.g. Greater Cairo"
                />
              </Field>
              <Field
                label="Areas in this zone"
                req
                hint="Type an area and press Enter — or paste several separated by commas. An area already in another zone can't be added."
              >
                <div className="flex gap-2">
                  <input
                    value={areaText}
                    onChange={(e) => setAreaText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addAreaToForm();
                      }
                    }}
                    className={inputCls}
                    placeholder="e.g. Maadi, Zamalek"
                  />
                  <Button onClick={addAreaToForm}>Add</Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {zf.areas.map((a) => (
                    <span
                      key={a}
                      className="rounded-full border border-border px-2.5 py-0.5 text-[12px]"
                    >
                      {a}{" "}
                      <button
                        type="button"
                        aria-label={`Remove ${a}`}
                        onClick={() => setZf({ ...zf, areas: zf.areas.filter((x) => x !== a) })}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  {!zf.areas.length && (
                    <span className="text-[12px] text-muted-foreground">No areas yet</span>
                  )}
                </div>
              </Field>
              <div className="grid gap-3.5 sm:grid-cols-3">
                <Field label="Fee (EGP)" req>
                  <input
                    value={zf.fee}
                    onChange={(e) => setZf({ ...zf, fee: e.target.value })}
                    className={inputCls}
                  />
                </Field>
                <Field label="Free over (EGP)">
                  <input
                    value={zf.free}
                    onChange={(e) => setZf({ ...zf, free: e.target.value })}
                    className={inputCls}
                    placeholder="e.g. 3,000"
                  />
                </Field>
                <Field label="Arrives in">
                  <input
                    value={zf.eta}
                    onChange={(e) => setZf({ ...zf, eta: e.target.value })}
                    className={inputCls}
                  />
                </Field>
              </div>
              {([["cod", "Cash on delivery allowed"]] as const).map(([k, l]) => (
                <div
                  key={k}
                  className="flex items-center justify-between gap-3.5 border-b border-line-soft py-2.5 last:border-b-0"
                >
                  <span className="text-[13.5px]">{l}</span>
                  <Toggle on={zf[k]} onChange={() => setZf({ ...zf, [k]: !zf[k] })} label={l} />
                </div>
              ))}
            </>
          )}
          <DialogFooter>
            <Button onClick={() => setZf(null)}>Cancel</Button>
            <Button primary onClick={saveZone}>
              {zf?.id ? "Save zone" : "Add zone"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!delZone} onOpenChange={(o) => !o && setDelZone(null)}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-head text-[18px] font-normal">
              Delete {delZone?.name}?
            </DialogTitle>
          </DialogHeader>
          <p className="text-[13.5px]">
            Its {delZone?.areas.length} area{delZone?.areas.length === 1 ? "" : "s"} (
            {delZone?.areas.join(", ")}) will have no zone, so customers there can't be delivered to
            until you add them to another zone.
          </p>
          <DialogFooter>
            <Button onClick={() => setDelZone(null)}>Cancel</Button>
            <Button
              primary
              onClick={() => {
                if (delZone) {
                  deleteZone(delZone.id);
                  toast(`${delZone.name} deleted`);
                }
                setDelZone(null);
              }}
            >
              Delete zone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!af} onOpenChange={(o) => !o && setAf(null)}>
        <DialogContent className="max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="font-head text-[18px] font-normal">
              {af?.old ? "Edit area" : "Add area"}
            </DialogTitle>
          </DialogHeader>
          {af && (
            <>
              <Field label="Area name" req>
                <input
                  autoFocus
                  value={af.name}
                  onChange={(e) => setAf({ ...af, name: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field
                label="Zone"
                req
                hint={af.old ? "Choose a different zone to move this area." : undefined}
              >
                <select
                  value={af.zoneId}
                  onChange={(e) => setAf({ ...af, zoneId: e.target.value })}
                  className={cn(inputCls, "cursor-pointer")}
                >
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name} · {formatMoney(z.fee)}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )}
          <DialogFooter>
            <Button onClick={() => setAf(null)}>Cancel</Button>
            <Button primary onClick={saveArea}>
              {af?.old ? "Save area" : "Add area"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!delArea} onOpenChange={(o) => !o && setDelArea(null)}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-head text-[18px] font-normal">
              Delete {delArea?.area}?
            </DialogTitle>
          </DialogHeader>
          <p className="text-[13.5px]">
            It is removed from {delArea?.zone.name}. Customers in this area can't be delivered to
            until it is added to a zone again.
          </p>
          <DialogFooter>
            <Button onClick={() => setDelArea(null)}>Cancel</Button>
            <Button primary onClick={confirmDelArea}>
              Delete area
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
