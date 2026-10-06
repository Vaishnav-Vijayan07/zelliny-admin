import { useSuspenseQuery } from "@tanstack/react-query";
import { attributesQuery } from "@/lib/api/sections.functions";
import { useAttributes } from "@/components/admin/AttributeFlow";
import { AttributeEditor } from "@/components/admin/AttributeEditor";

export default function AttributeEditPage({ attributeId }: { attributeId: string }) {
  const { data } = useSuspenseQuery(attributesQuery());
  const attribute = useAttributes(data).find((a) => a.id === attributeId) ?? null;

  if (!attribute)
    return <p className="py-24 text-center text-muted-foreground">Attribute not found.</p>;
  return <AttributeEditor attribute={attribute} />;
}
