import { createFileRoute } from "@tanstack/react-router";
import { attributesQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import AttributeValuesPage from "@/pages/AttributeValuesPage";

// Page UI lives in src/pages/AttributeValuesPage.tsx
export const Route = createFileRoute("/attributes_/$attributeId_/values")({
  head: ({ params }) => pageHead(`Attribute ${params.attributeId} — Values`, "Add, edit and delete the values customers can pick for this attribute."),
  loader: ({ context }) => context.queryClient.ensureQueryData(attributesQuery()),
  component: AttributeValuesRoute,
});

function AttributeValuesRoute() {
  const { attributeId } = Route.useParams();
  return <AttributeValuesPage key={attributeId} attributeId={attributeId} />;
}
