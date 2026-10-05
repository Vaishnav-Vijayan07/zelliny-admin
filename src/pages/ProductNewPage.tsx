// "+ Add product" — the product editor with nothing filled in yet.
import { useSuspenseQuery } from "@tanstack/react-query";
import { productsQuery } from "@/lib/api/sections.functions";
import { ProductEditor } from "@/components/admin/ProductEditor";

export default function ProductNewPage() {
  const { data } = useSuspenseQuery(productsQuery());
  return <ProductEditor product={null} brands={data.brands} categories={data.categories} />;
}
