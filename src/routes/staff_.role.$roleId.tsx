import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import StaffRolePage from "@/pages/StaffRolePage";

// Page UI lives in src/pages/StaffRolePage.tsx
export const Route = createFileRoute("/staff_/role/$roleId")({
  head: () => pageHead("Role", "Choose which sections a role can open and what it can do."),
  component: RoleRoute,
});

function RoleRoute() {
  const { roleId } = Route.useParams();
  return <StaffRolePage key={roleId} roleId={roleId} />;
}
