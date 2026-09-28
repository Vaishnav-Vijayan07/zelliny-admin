import { createFileRoute } from "@tanstack/react-router";
import { simplePageQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import { SimpleSectionPage } from "@/components/admin/SimpleSectionPage";

export const Route = createFileRoute("/selling")({
  head: () => pageHead("Selling control", "Choose which Zelliny categories sell online and which are enquiry only."),
  loader: ({ context }) => context.queryClient.ensureQueryData(simplePageQuery("selling")),
  component: () => <SimpleSectionPage sectionKey="selling" title="Selling control" subtitle="Decide what shoppers can buy directly and what goes through an enquiry." />,
});
