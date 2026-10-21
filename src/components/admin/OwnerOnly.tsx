// Shows its children to the owner only — staff can switch things off or archive them, never delete.
import type { ReactNode } from "react";
import { useIsOwner } from "@/pages/StaffPage";

export function OwnerOnly({ children }: { children: ReactNode }) {
  return useIsOwner() ? <>{children}</> : null;
}
