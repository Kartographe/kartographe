import { useLingui } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_app/accounts/$accountId/features")({
  component: FeaturesPage,
});

function FeaturesPage() {
  const { t } = useLingui();
  return <ComingSoon title={t`Fonctionnalités`} />;
}
