// One product's pre-orders: who pre-ordered and when.
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { inventoryQuery, productsQuery } from "@/lib/api/sections.functions";
import { formatMoney } from "@/lib/format";
import { Avatar, Panel, StatusBadge } from "@/components/admin/primitives";
import { Button, DataTable, PageHeader } from "@/components/admin/page";
import { useProducts } from "@/components/admin/ProductFlow";
import { useInventory, usePreorderDialog } from "@/components/admin/InventoryFlow";

export default function PreorderPage({ productId }: { productId: string }) {
  const { data: productsData } = useSuspenseQuery(productsQuery());
  const { data } = useSuspenseQuery(inventoryQuery());
  const navigate = useNavigate();
  const products = useProducts(productsData.rows);
  const p = products.find((x) => x.id === productId);
  const r = useInventory(data).preorders.find((x) => x.productId === productId);
  const edit = usePreorderDialog();
  const crumb = (
    <div className="mb-2 text-[12px] text-muted-foreground">
      <Link to="/inventory" search={{ tab: "Pre-orders" }} className="underline underline-offset-[3px]">Pre-orders</Link> / {p?.name ?? productId}
    </div>
  );
  if (!p || !r) return <>{crumb}<p className="py-24 text-center text-muted-foreground">This product is not on pre-order.</p></>;
  const n = r.customers.length;
  return (
    <>
      {crumb}
      <PageHeader
        title={p.name}
        subtitle={`SKU ${p.sku} · expected ${r.expected || "—"} · ${n} of ${r.limit} pre-ordered · ${r.open && n < r.limit ? "open" : "closed"}`}
        actions={<><Button onClick={() => edit.show(products, r)}>Edit pre-order</Button><Button primary onClick={() => navigate({ to: "/products/$productId", params: { productId: p.id } })}>Open product</Button></>}
      />
      <Panel title="Customers who pre-ordered">
        <DataTable rows={r.customers} rowKey={(c) => c.customerId} empty="No pre-orders yet on this product."
          onRowClick={(c) => navigate({ to: "/customers/$customerId", params: { customerId: c.customerId } })}
          columns={[
            { header: "Customer", cell: (c) => <div className="flex items-center gap-2.5"><Avatar name={c.name} className="size-[30px] text-[11px]" /><b className="font-medium">{c.name}</b></div> },
            { header: "Pre-ordered on", cell: (c) => c.date },
            { header: "Pieces", align: "right", cell: () => 1 },
            { header: "Paid", align: "right", cell: () => formatMoney(p.offer || p.price || 0) },
            { header: "Status", cell: () => <StatusBadge tone="ok">Confirmed</StatusBadge> },
          ]} />
      </Panel>
      <p className="mt-3 text-[12px] text-muted-foreground">Click a customer to open their page. When stock arrives, these orders move to the front of Orders with a Pre-order tag.</p>
      {edit.dialog}
    </>
  );
}
