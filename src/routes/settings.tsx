import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import SettingsPage from "@/pages/SettingsPage";

// Page UI lives in src/pages/SettingsPage.tsx
export const Route = createFileRoute("/settings")({
  head: () => pageHead("Settings", "Store details, checkout, notifications and policies."),
  component: SettingsPage,
});
