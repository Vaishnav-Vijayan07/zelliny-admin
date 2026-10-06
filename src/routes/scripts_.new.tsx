import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import ScriptEditPage from "@/pages/ScriptEditPage";

// Page UI lives in src/pages/ScriptEditPage.tsx
export const Route = createFileRoute("/scripts_/new")({
  head: () => pageHead("Add script", "Paste a tracking script and choose where it runs."),
  component: () => <ScriptEditPage />,
});
