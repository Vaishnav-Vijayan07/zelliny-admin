import { createFileRoute } from "@tanstack/react-router";
import { enquiriesQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import EnquiriesPage from "@/pages/EnquiriesPage";

// Page UI lives in src/pages/EnquiriesPage.tsx
export const Route = createFileRoute("/enquiries")({
  head: () => pageHead("Corporate enquiries", "Corporate gifting enquiries moving from new to quoted to won."),
  loader: ({ context }) => context.queryClient.ensureQueryData(enquiriesQuery()),
  component: EnquiriesPage,
});
