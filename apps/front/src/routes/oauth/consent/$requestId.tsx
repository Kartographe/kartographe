import { useLingui } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { Result, Skeleton } from "antd";
import { $api } from "@/api/$api";
import { MCPConsentScreen } from "@/features/mcp/mcp-consent-screen";
import { OAuthPageShell } from "@/features/mcp/oauth-page-shell";
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
    "/me/mcp/authorize/{request_id}",
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
      {data ? <MCPConsentScreen request={data.item} /> : null}
    </OAuthPageShell>
  );
}
