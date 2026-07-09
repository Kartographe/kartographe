import { createFileRoute } from "@tanstack/react-router";
import { CommentsScreen } from "@/features/applications/comments/comments-screen";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/applications/$applicationId/comments"
)({
  component: CommentsPage,
});

function CommentsPage() {
  const { accountId, applicationId } = Route.useParams();
  return <CommentsScreen accountId={accountId} applicationId={applicationId} />;
}
