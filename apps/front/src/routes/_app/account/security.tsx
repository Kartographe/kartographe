import { createFileRoute } from "@tanstack/react-router";
import { SecurityScreen } from "@/features/account/screens/security-screen";

export const Route = createFileRoute("/_app/account/security")({
  component: SecurityScreen,
});
