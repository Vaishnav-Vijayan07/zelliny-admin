import { BundleEditor } from "@/components/admin/BundleEditor";

export default function BundleEditPage({ bundleId }: { bundleId?: string | undefined }) {
  return <BundleEditor id={bundleId} />;
}
