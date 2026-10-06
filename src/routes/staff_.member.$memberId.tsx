import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import StaffMemberPage from "@/pages/StaffMemberPage";

// Page UI lives in src/pages/StaffMemberPage.tsx
export const Route = createFileRoute("/staff_/member/$memberId")({
  head: () => pageHead("Team member", "Change a team member's role, details and access."),
  component: MemberRoute,
});

function MemberRoute() {
  const { memberId } = Route.useParams();
  return <StaffMemberPage key={memberId} memberId={memberId} />;
}
