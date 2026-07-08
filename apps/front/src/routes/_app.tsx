import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell/app-shell";
import { requireSession } from "@/lib/auth/require-session";

export const Route = createFileRoute("/_app")({
  beforeLoad: requireSession,
  component: AppShell,
});
