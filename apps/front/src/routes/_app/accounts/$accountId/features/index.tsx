import { createFileRoute } from "@tanstack/react-router";
import { FeaturesList } from "@/features/features/features-list";

export const Route = createFileRoute("/_app/accounts/$accountId/features/")({
  component: FeaturesPage,
});

function FeaturesPage() {
  const { accountId } = Route.useParams();
  return <FeaturesList accountId={accountId} />;
}
