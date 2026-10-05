// One product's back-in-stock waiting list.
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { inventoryQuery, productsQuery } from "@/lib/api/sections.functions";
import type { WaitingCustomer } from "@/lib/api/section-types";
import { Avatar, Panel, StatusBadge } from "@/components/admin/primitives";
import { Button, DataTable, PageHeader } from "@/components/admin/page";
import { stockLabel, useProducts } from "@/components/admin/ProductFlow";
import { useInventory, useNotifyDialog } from "@/components/admin/InventoryFlow";

export default function WaitingListPage({ productId }: { productId: string }) {
  const { data: productsData } = useSuspenseQuery(productsQuery());
  const { data } = useSuspenseQuery(inventoryQuery());
  const p = useProducts(productsData.rows).find((x) => x.id === productId);
  const w = useInventory(data).waitlists.find((x) => x.productId === productId);
  const notify = useNotifyDialog();
  const crumb = (
    <div className="mb-2 text-[12px] text-muted-foreground">
      <Link to="/inventory" search={{ tab: "Back-in-stock requests" }} className="underline underline-offset-[3px]">Back-in-stock requests</Link> / {p?.name ?? productId}
    </div>
  );
  if (!p || !w) return <>{crumb}<p className="py-24 text-center text-muted-foreground">Nobody is waiting for this product.</p></>;
  const waiting = w.customers.filter((c) => !c.notified);
  return (
    <>
      {crumb}
      <PageHeader
        title={p.name}
        subtitle={`SKU ${p.sku} · ${stockLabel(p.stock)} · ${p.stock} on hand · ${waiting.length} waiting`}
        actions={<>
          <Link to="/products/$productId" params={{ productId: p.id }} className="rounded-lg border border-border bg-surface px-4 py-2 text-[13px] hover:bg-hover">Open product</Link>
          {waiting.length > 0 && p.stock > 0 && <Button primary onClick={() => notify.show(p, w)}>Notify customers</Button>}
        </>}
      />
      {!p.stock && <div className="mb-5 rounded-lg border border-border border-l-[3px] border-l-primary px-3 py-2.5 text-[13px]">Still out of stock. Notify unlocks as soon as you add stock to this product.</div>}
      <Panel title="Waiting list">
        <DataTable<WaitingCustomer> rows={w.customers} rowKey={(c) => c.id} empty="Nobody is waiting for this product." columns={[
          { header: "Customer", cell: (c) => <div className="flex items-center gap-2.5"><Avatar name={c.name} className="size-[30px] text-[11px]" /><b className="font-medium">{c.name}</b></div> },
          { header: "Email", cell: (c) => c.email },
          { header: "Asked on", cell: (c) => c.date },
          { header: "Account", cell: (c) => c.account },
          { header: "Language", cell: (c) => c.language },
          { header: "Status", cell: (c) => (c.notified ? <><span className="text-good">Notified</span><div className="text-[12px] text-muted-foreground">{c.notified}</div></> : <StatusBadge tone="warn">Waiting</StatusBadge>) },
        ]} />
      </Panel>
      {notify.dialog}
    </>
  );
}
