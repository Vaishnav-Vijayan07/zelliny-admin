import { CatalogueEditor } from "@/components/admin/CatalogueEditor";

export default function BrandEditPage({ brandId }: { brandId?: string }) {
  return <CatalogueEditor kind="maison" id={brandId} />;
}
