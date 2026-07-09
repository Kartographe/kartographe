import { createFileRoute } from "@tanstack/react-router";
import { ServiceCommentsScreen } from "@/features/services/comments/service-comments-screen";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/services/$serviceId/comments"
)({
  component: ServiceCommentsPage,
});

function ServiceCommentsPage() {
  const { accountId, serviceId } = Route.useParams();
  return <ServiceCommentsScreen accountId={accountId} serviceId={serviceId} />;
}
