import { createFileRoute } from "@tanstack/react-router";
import { browsingQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import BrowserDetailPage from "@/pages/BrowserDetailPage";

// Page UI lives in src/pages/BrowserDetailPage.tsx
export const Route = createFileRoute("/browsing_/$browserId")({
  head: () =>
    pageHead(
      "Browsing history",
      "Everything this person looked at, where they stopped, and the follow-ups sent.",
    ),
  loader: ({ context }) => context.queryClient.ensureQueryData(browsingQuery()),
  component: BrowserRoute,
});

function BrowserRoute() {
  const { browserId } = Route.useParams();
  return <BrowserDetailPage key={browserId} id={browserId} />;
}
