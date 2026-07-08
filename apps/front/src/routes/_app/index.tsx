import { createFileRoute } from "@tanstack/react-router";
import { DashboardScreen } from "@/features/account/screens/dashboard-screen";

export const Route = createFileRoute("/_app/")({
  component: DashboardScreen,
});
