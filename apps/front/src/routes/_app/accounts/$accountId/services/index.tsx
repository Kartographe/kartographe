import { createFileRoute } from "@tanstack/react-router";
import { ServicesList } from "@/features/services/services-list";

export const Route = createFileRoute("/_app/accounts/$accountId/services/")({
  component: ServicesPage,
});

function ServicesPage() {
  const { accountId } = Route.useParams();
  return <ServicesList accountId={accountId} />;
}
