import { createFileRoute } from "@tanstack/react-router";
import { simplePageQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import { SimpleSectionPage } from "@/components/admin/SimpleSectionPage";

export const Route = createFileRoute("/loyalty")({
  head: () => pageHead("Loyalty programme", "Zelliny loyalty points, tiers and member figures."),
  loader: ({ context }) => context.queryClient.ensureQueryData(simplePageQuery("loyalty")),
  component: () => <SimpleSectionPage sectionKey="loyalty" title="Loyalty programme" subtitle="How customers earn and spend points." />,
});
