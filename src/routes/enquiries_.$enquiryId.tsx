import { createFileRoute } from "@tanstack/react-router";
import { enquiriesQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import EnquiryDetailPage from "@/pages/EnquiryDetailPage";

// Page UI lives in src/pages/EnquiryDetailPage.tsx
export const Route = createFileRoute("/enquiries_/$enquiryId")({
  head: ({ params }) => pageHead(`Enquiry ${params.enquiryId}`, "One corporate enquiry: stage, client, where they came from, quotation and history."),
  loader: ({ context }) => context.queryClient.ensureQueryData(enquiriesQuery()),
  component: EnquiryRoute,
});

function EnquiryRoute() {
  const { enquiryId } = Route.useParams();
  return <EnquiryDetailPage key={enquiryId} enquiryId={enquiryId} />;
}
