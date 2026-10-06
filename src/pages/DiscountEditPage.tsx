import { DiscountEditor } from "@/components/admin/DiscountEditor";

export default function DiscountEditPage({ code }: { code?: string | undefined }) {
  return <DiscountEditor code={code} />;
}
