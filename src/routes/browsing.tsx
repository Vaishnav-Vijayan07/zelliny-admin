import { createFileRoute } from "@tanstack/react-router";
import { browsingQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import BrowsingPage from "@/pages/BrowsingPage";

// Page UI lives in src/pages/BrowsingPage.tsx
export const Route = createFileRoute("/browsing")({
  head: () => pageHead("Browsing & follow-up", "People who browsed Zelliny and the follow-up emails you can send them."),
  loader: ({ context }) => context.queryClient.ensureQueryData(browsingQuery()),
  component: BrowsingPage,
});
