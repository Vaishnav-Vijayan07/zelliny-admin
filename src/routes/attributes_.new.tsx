import { createFileRoute } from "@tanstack/react-router";
import { attributesQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import AttributeNewPage from "@/pages/AttributeNewPage";

// Page UI lives in src/pages/AttributeNewPage.tsx
export const Route = createFileRoute("/attributes_/new")({
  head: () => pageHead("Add attribute", "Create an attribute, then add its values."),
  loader: ({ context }) => context.queryClient.ensureQueryData(attributesQuery()),
  component: AttributeNewPage,
});
