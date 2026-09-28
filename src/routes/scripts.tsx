import { createFileRoute } from "@tanstack/react-router";
import { simplePageQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import { SimpleSectionPage } from "@/components/admin/SimpleSectionPage";

export const Route = createFileRoute("/scripts")({
  head: () => pageHead("Tracking & scripts", "Analytics, pixels and custom scripts running on zelliny.com."),
  loader: ({ context }) => context.queryClient.ensureQueryData(simplePageQuery("scripts")),
  component: () => <SimpleSectionPage sectionKey="scripts" title="Tracking & scripts" subtitle="Measurement tools and extra code added to the site." />,
});
