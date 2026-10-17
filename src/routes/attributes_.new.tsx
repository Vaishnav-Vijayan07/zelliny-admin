import { createFileRoute } from "@tanstack/react-router";
import { attributesQuery, categoriesQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import AttributeNewPage from "@/pages/AttributeNewPage";

// Page UI lives in src/pages/AttributeNewPage.tsx
export const Route = createFileRoute("/attributes_/new")({
  head: () => pageHead("Add attribute", "Create an attribute, then add its values."),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(attributesQuery()),
      context.queryClient.ensureQueryData(categoriesQuery()),
    ]),
  component: AttributeNewPage,
});
