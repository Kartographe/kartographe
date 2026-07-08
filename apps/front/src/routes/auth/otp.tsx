import { createFileRoute } from "@tanstack/react-router";
import { OtpScreen } from "@/features/auth/screens/otp-screen";

export const Route = createFileRoute("/auth/otp")({
  component: OtpScreen,
});
