import { createFileRoute } from "@tanstack/react-router";
import { simplePageQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import { SimpleSectionPage } from "@/components/admin/SimpleSectionPage";

export const Route = createFileRoute("/settings")({
  head: () => pageHead("Settings", "Store details, payment methods and notification settings for Zelliny."),
  loader: ({ context }) => context.queryClient.ensureQueryData(simplePageQuery("settings")),
  component: () => <SimpleSectionPage sectionKey="settings" title="Settings" subtitle="Store-wide details and preferences." />,
});
