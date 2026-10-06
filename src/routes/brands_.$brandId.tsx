import { createFileRoute } from "@tanstack/react-router";
import { brandsQuery, categoriesQuery, productsQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import BrandEditPage from "@/pages/BrandEditPage";

// Page UI lives in src/pages/BrandEditPage.tsx
export const Route = createFileRoute("/brands_/$brandId")({
  head: () => pageHead("Edit maison", "Edit a maison: story, logo, placement and selling mode."),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(categoriesQuery()),
      context.queryClient.ensureQueryData(brandsQuery()),
      context.queryClient.ensureQueryData(productsQuery()),
    ]),
  component: BrandRoute,
});
function BrandRoute() {
  const { brandId } = Route.useParams();
  return <BrandEditPage key={brandId} brandId={brandId} />;
}
