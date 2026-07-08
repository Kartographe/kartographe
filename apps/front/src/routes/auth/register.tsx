import { createFileRoute } from "@tanstack/react-router";
import { RegisterScreen } from "@/features/auth/screens/register-screen";

export const Route = createFileRoute("/auth/register")({
  component: RegisterScreen,
});
