import { createFileRoute } from "@tanstack/react-router";
import { simplePageQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import { SimpleSectionPage } from "@/components/admin/SimpleSectionPage";

export const Route = createFileRoute("/gifting")({
  head: () => pageHead("Gift services", "Wrapping, cards and engraving offered with Zelliny orders."),
  loader: ({ context }) => context.queryClient.ensureQueryData(simplePageQuery("gifting")),
  component: () => <SimpleSectionPage sectionKey="gifting" title="Gift services" subtitle="Extras shoppers can add at checkout." />,
});
