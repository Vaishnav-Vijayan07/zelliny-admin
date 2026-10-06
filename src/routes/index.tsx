import { createFileRoute } from "@tanstack/react-router";
import { dashboardQuery } from "@/lib/api/admin.functions";
import Dashboard from "@/pages/DashboardPage";

// Page UI lives in src/pages/DashboardPage.tsx
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Zelliny Admin" },
      {
        name: "description",
        content: "Today's orders, revenue, stock and corporate enquiries for Zelliny.",
      },
      { property: "og:title", content: "Dashboard — Zelliny Admin" },
      {
        property: "og:description",
        content: "Today's orders, revenue, stock and corporate enquiries for Zelliny.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(dashboardQuery("30d")),
  component: Dashboard,
});
