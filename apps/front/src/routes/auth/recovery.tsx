import { createFileRoute } from "@tanstack/react-router";
import { RecoveryScreen } from "@/features/auth/screens/recovery-screen";

export const Route = createFileRoute("/auth/recovery")({
  component: RecoveryScreen,
});
