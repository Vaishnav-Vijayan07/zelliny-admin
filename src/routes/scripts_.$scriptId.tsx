import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import ScriptEditPage from "@/pages/ScriptEditPage";

// Page UI lives in src/pages/ScriptEditPage.tsx
export const Route = createFileRoute("/scripts_/$scriptId")({
  head: () =>
    pageHead("Edit script", "Edit a tracking script, its position and its version history."),
  component: ScriptRoute,
});

function ScriptRoute() {
  const { scriptId } = Route.useParams();
  return <ScriptEditPage key={scriptId} scriptId={scriptId} />;
}
