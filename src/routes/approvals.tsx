import { createFileRoute } from "@tanstack/react-router";
import { approvalsQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import ApprovalsPage from "@/pages/ApprovalsPage";

// Page UI lives in src/pages/ApprovalsPage.tsx
export const Route = createFileRoute("/approvals")({
  head: () =>
    pageHead("Approvals", "Changes from the Zelliny team waiting for the owner's approval."),
  loader: ({ context }) => context.queryClient.ensureQueryData(approvalsQuery()),
  component: ApprovalsPage,
});
