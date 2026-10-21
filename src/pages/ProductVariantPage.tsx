import { ProductVariantEditor } from "@/components/admin/ProductVariantEditor";

export default function ProductVariantPage({ variantId }: { variantId: string }) {
  return <ProductVariantEditor variantId={variantId} />;
}
