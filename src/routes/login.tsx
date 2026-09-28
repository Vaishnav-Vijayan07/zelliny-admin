import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import LoginPage from "@/pages/LoginPage";

// Page UI lives in src/pages/LoginPage.tsx
export const Route = createFileRoute("/login")({
  head: () => pageHead("Sign in", "Sign in to manage the Zelliny store."),
  component: LoginPage,
});
