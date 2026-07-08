import { createFileRoute } from "@tanstack/react-router";
import { MeInvitationsList } from "@/features/accounts/me-invitations-list";

export const Route = createFileRoute("/_app/me/invitations")({
  component: MeInvitationsList,
});
