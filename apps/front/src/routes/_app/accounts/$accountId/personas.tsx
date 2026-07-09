import { createFileRoute } from "@tanstack/react-router";
import { PersonasList } from "@/features/personas/personas-list";

export const Route = createFileRoute("/_app/accounts/$accountId/personas")({
  component: PersonasPage,
});

function PersonasPage() {
  const { accountId } = Route.useParams();
  return <PersonasList accountId={accountId} />;
}
