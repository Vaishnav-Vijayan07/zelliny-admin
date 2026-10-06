import { createFileRoute } from "@tanstack/react-router";
import { returnsQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import ReturnDetailPage from "@/pages/ReturnDetailPage";

// Page UI lives in src/pages/ReturnDetailPage.tsx
export const Route = createFileRoute("/returns_/$returnId")({
  head: ({ params }) =>
    pageHead(
      `Return ${params.returnId}`,
      "One Zelliny return: next step, who did what, policy check and refund.",
    ),
  loader: ({ context }) => context.queryClient.ensureQueryData(returnsQuery()),
  component: ReturnRoute,
});

function ReturnRoute() {
  const { returnId } = Route.useParams();
  return <ReturnDetailPage returnId={returnId} />;
}
