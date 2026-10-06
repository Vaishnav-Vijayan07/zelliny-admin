import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import ScriptsPage from "@/pages/ScriptsPage";

// Page UI lives in src/pages/ScriptsPage.tsx
export const Route = createFileRoute("/scripts")({
  head: () => pageHead("Tracking & scripts", "Add, edit and switch off tracking pixels and scripts on the site."),
  component: ScriptsPage,
});
