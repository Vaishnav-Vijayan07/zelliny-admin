import { CatalogueEditor } from "@/components/admin/CatalogueEditor";

export default function CategoryEditPage({ categoryId }: { categoryId?: string }) {
  return <CatalogueEditor kind="category" id={categoryId} />;
}
