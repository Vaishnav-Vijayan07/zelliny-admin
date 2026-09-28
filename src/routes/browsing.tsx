import { createFileRoute } from "@tanstack/react-router";
import { simplePageQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import { SimpleSectionPage } from "@/components/admin/SimpleSectionPage";

export const Route = createFileRoute("/browsing")({
  head: () => pageHead("Browsing & follow-up", "Live shoppers on zelliny.com and automated follow-up messages."),
  loader: ({ context }) => context.queryClient.ensureQueryData(simplePageQuery("browsing")),
  component: () => <SimpleSectionPage sectionKey="browsing" title="Browsing & follow-up" subtitle="Who is on the site now, and the reminders sent after they leave." />,
});
