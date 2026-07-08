import { createFileRoute } from "@tanstack/react-router";
import { PreferencesScreen } from "@/features/account/screens/preferences-screen";

export const Route = createFileRoute("/_app/me/settings")({
  component: PreferencesScreen,
});
