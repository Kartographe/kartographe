import { createFileRoute } from "@tanstack/react-router";
import { ActivityScreen } from "@/features/account/screens/activity-screen";

export const Route = createFileRoute("/_app/me/logs")({
  component: ActivityScreen,
});
