import { Link } from "@tanstack/react-router";
import type { OrderSummary } from "@/lib/api/types";
import { Panel, PanelFooter, SectionLink, StatusBadge } from "@/components/admin/primitives";
import { formatMoney } from "@/lib/format";

export function OrderRow({ order }: { order: OrderSummary }) {
  return (
    <Link
      to="/$section"
      params={{ section: "orders" }}
      className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md border-b border-line-soft px-1 py-3 hover:bg-hover md:grid-cols-[2.4fr_1fr_1fr_1fr_auto]"
    >
      <div className="min-w-0">
        <b className="block text-[13.5px] font-medium">{order.customer}</b>
        <span className="text-[12px] text-muted-foreground">
          {order.id} · {order.placedAt}
        </span>
      </div>
      <div className="hidden text-[13px] text-muted-foreground md:block">{order.city}</div>
      <div className="hidden text-[12.5px] text-muted-foreground md:block">{order.payment}</div>
      <div className="hidden md:block">
        <StatusBadge tone={order.tone}>{order.status}</StatusBadge>
      </div>
      <div className="text-right text-[13.5px] font-medium">
        {formatMoney(order.total, order.currency)}
      </div>
    </Link>
  );
}

export function LatestOrders({ orders, more }: { orders: OrderSummary[]; more: number }) {
  return (
    <Panel
      title="Latest orders"
      action={<SectionLink to="orders">All orders</SectionLink>}
      className="mb-5"
    >
      {orders.map((o) => (
        <OrderRow key={o.id} order={o} />
      ))}
      <PanelFooter count={more} label="orders" to="orders" />
    </Panel>
  );
}
