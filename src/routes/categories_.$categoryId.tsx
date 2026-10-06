import { createFileRoute } from "@tanstack/react-router";
import { brandsQuery, categoriesQuery, productsQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import CategoryEditPage from "@/pages/CategoryEditPage";

// Page UI lives in src/pages/CategoryEditPage.tsx
export const Route = createFileRoute("/categories_/$categoryId")({
  head: () =>
    pageHead("Edit category", "Edit a Zelliny category: name, text, images and selling mode."),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(categoriesQuery()),
      context.queryClient.ensureQueryData(brandsQuery()),
      context.queryClient.ensureQueryData(productsQuery()),
    ]),
  component: CategoryRoute,
});
function CategoryRoute() {
  const { categoryId } = Route.useParams();
  return <CategoryEditPage key={categoryId} categoryId={categoryId} />;
}
