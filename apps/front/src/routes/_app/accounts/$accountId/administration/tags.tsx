import { createFileRoute } from "@tanstack/react-router";
import { TagsScreen } from "@/features/tags/tags-screen";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/administration/tags"
)({
  component: TagsPage,
});

function TagsPage() {
  const { accountId } = Route.useParams();
  return <TagsScreen accountId={accountId} />;
}
