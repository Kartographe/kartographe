import { useLingui } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { Result, Skeleton } from "antd";
import { $api } from "@/api/$api";
import { IntegrationConsentScreen } from "@/features/integrations/integration-consent-screen";
import { OAuthPageShell } from "@/features/integrations/oauth-page-shell";
import { requireSession } from "@/lib/auth/require-session";

export const Route = createFileRoute("/oauth/consent/$requestId")({
  beforeLoad: requireSession,
  component: ConsentPage,
});

function ConsentPage() {
  const { t } = useLingui();
  const { requestId } = Route.useParams();
  const { data, isLoading, isError } = $api.useQuery(
    "get",
    "/me/integrations/authorize/{request_id}",
    { params: { path: { request_id: requestId } } }
  );

  return (
    <OAuthPageShell>
      {isLoading ? <Skeleton active paragraph={{ rows: 4 }} /> : null}
      {isError || !(isLoading || data) ? (
        <Result
          status="warning"
          subTitle={t`Cette demande est introuvable ou a expiré.`}
          title={t`Demande invalide`}
        />
      ) : null}
      {data ? <IntegrationConsentScreen request={data.item} /> : null}
    </OAuthPageShell>
  );
}
