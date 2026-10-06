import { createFileRoute } from "@tanstack/react-router";
import { attributesQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import AttributesPage from "@/pages/AttributesPage";

// Page UI lives in src/pages/AttributesPage.tsx
export const Route = createFileRoute("/attributes")({
  head: () =>
    pageHead(
      "Attributes",
      "Variant options like colour and size, and the values customers can pick on a product.",
    ),
  loader: ({ context }) => context.queryClient.ensureQueryData(attributesQuery()),
  component: AttributesPage,
});
