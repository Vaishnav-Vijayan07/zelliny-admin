import { createFileRoute } from "@tanstack/react-router";
import { staffQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import StaffPage from "@/pages/StaffPage";

// Page UI lives in src/pages/StaffPage.tsx
export const Route = createFileRoute("/staff")({
  head: () => pageHead("Team & permissions", "Zelliny admin team members, roles and what each can access."),
  loader: ({ context }) => context.queryClient.ensureQueryData(staffQuery()),
  component: StaffPage,
});
