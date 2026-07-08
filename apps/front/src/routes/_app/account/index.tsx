import { createFileRoute } from "@tanstack/react-router";
import { ProfileScreen } from "@/features/account/screens/profile-screen";

export const Route = createFileRoute("/_app/account/")({
  component: ProfileScreen,
});
