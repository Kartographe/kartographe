import { createFileRoute } from "@tanstack/react-router";
import { U2fScreen } from "@/features/auth/screens/u2f-screen";

export const Route = createFileRoute("/auth/u2f")({
  component: U2fScreen,
});
