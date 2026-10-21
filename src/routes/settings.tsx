import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { pageHead } from "@/lib/seo";
import SettingsPage from "@/pages/SettingsPage";

// Page UI lives in src/pages/SettingsPage.tsx
export const Route = createFileRoute("/settings")({
  // ?tab=templates&from=C201 opens Message templates with a back link to that customer
  // (from=customers goes back to the Customers list).
  validateSearch: z.object({
    tab: z.literal("templates").optional(),
    from: z.string().max(20).optional(),
  }),
  head: () => pageHead("Settings", "Store details, checkout, payments, notifications, message templates and connections."),
  component: SettingsRoute,
});

function SettingsRoute() {
  const { tab, from } = Route.useSearch();
  return (
    <SettingsPage
      key={`${tab ?? ""}${from ?? ""}`}
      initialTab={tab ? "Message templates" : undefined}
      from={from}
    />
  );
}
