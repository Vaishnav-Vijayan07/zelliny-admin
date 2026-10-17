import { createFileRoute } from "@tanstack/react-router";
import { attributesQuery, categoriesQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import AttributeEditPage from "@/pages/AttributeEditPage";

// Page UI lives in src/pages/AttributeEditPage.tsx
export const Route = createFileRoute("/attributes_/$attributeId")({
  head: ({ params }) =>
    pageHead(
      `Attribute ${params.attributeId}`,
      "Edit a Zelliny attribute's name, preview type and status.",
    ),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(attributesQuery()),
      context.queryClient.ensureQueryData(categoriesQuery()),
    ]),
  component: AttributeEditRoute,
});

function AttributeEditRoute() {
  const { attributeId } = Route.useParams();
  return <AttributeEditPage attributeId={attributeId} />;
}
