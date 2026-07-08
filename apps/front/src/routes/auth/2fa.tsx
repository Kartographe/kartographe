import { createFileRoute } from "@tanstack/react-router";
import { TwoFactorChoiceScreen } from "@/features/auth/screens/two-factor-choice-screen";

export const Route = createFileRoute("/auth/2fa")({
  component: TwoFactorChoiceScreen,
});
