import { createFileRoute } from "@tanstack/react-router";
import { simplePageQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import { SimpleSectionPage } from "@/components/admin/SimpleSectionPage";

export const Route = createFileRoute("/content")({
  head: () => pageHead("Site content", "Homepage sections and pages on zelliny.com."),
  loader: ({ context }) => context.queryClient.ensureQueryData(simplePageQuery("content")),
  component: () => <SimpleSectionPage sectionKey="content" title="Site content" subtitle="What appears on the homepage and store pages." />,
});
