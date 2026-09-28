import { createFileRoute } from "@tanstack/react-router";
import { activityQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import ActivityPage from "@/pages/ActivityPage";

// Page UI lives in src/pages/ActivityPage.tsx
export const Route = createFileRoute("/activity")({
  head: () => pageHead("Activity log", "Every change made in the Zelliny admin and by the system, in order."),
  loader: ({ context }) => context.queryClient.ensureQueryData(activityQuery()),
  component: ActivityPage,
});
