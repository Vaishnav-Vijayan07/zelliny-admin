// One product — the product editor filled in, with performance and the danger zone.
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { productsQuery } from "@/lib/api/sections.functions";
import { PRODUCT_TABS, ProductEditor, type ProductTab } from "@/components/admin/ProductEditor";
import { useProducts } from "@/components/admin/ProductFlow";

export default function ProductDetailPage({ productId, tab }: { productId: string; tab?: string | undefined }) {
  const { data } = useSuspenseQuery(productsQuery());
  const product = useProducts(data.rows).find((p) => p.id === productId);
  if (!product) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <h1 className="text-[28px]">Product not found</h1>
        <p className="mt-2 text-muted-foreground">There is no product {productId}. <Link to="/products" className="underline">Back to Products</Link></p>
      </div>
    );
  }
  const initialTab = PRODUCT_TABS.find((t) => t === tab) ?? "General";
  return <ProductEditor product={product} brands={data.brands} categories={data.categories} initialTab={initialTab as ProductTab} />;
}
