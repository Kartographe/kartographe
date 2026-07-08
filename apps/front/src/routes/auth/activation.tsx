import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ActivationScreen } from "@/features/auth/screens/activation-screen";

const searchSchema = z.object({ token: z.string().optional() });

export const Route = createFileRoute("/auth/activation")({
  validateSearch: searchSchema,
  component: ActivationRoute,
});

function ActivationRoute() {
  const { token } = Route.useSearch();
  return <ActivationScreen token={token} />;
}
