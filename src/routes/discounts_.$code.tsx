import { createFileRoute } from "@tanstack/react-router";
import { brandsQuery, categoriesQuery, discountsQuery, productsQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import DiscountEditPage from "@/pages/DiscountEditPage";

// Page UI lives in src/pages/DiscountEditPage.tsx
export const Route = createFileRoute("/discounts_/$code")({
  head: ({ params }) => pageHead(`Discount ${params.code}`, "Edit the code, what it applies to, and when it runs."),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(discountsQuery()), context.queryClient.ensureQueryData(categoriesQuery()), context.queryClient.ensureQueryData(brandsQuery()), context.queryClient.ensureQueryData(productsQuery())]),
  component: DiscountRoute,
});

function DiscountRoute() {
  const { code } = Route.useParams();
  return <DiscountEditPage key={code} code={code} />;
}
