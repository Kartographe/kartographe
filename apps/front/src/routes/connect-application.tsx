import { useLingui } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { Result, Skeleton } from "antd";
import { z } from "zod";
import { $api } from "@/api/$api";
import { MCPConsentScreen } from "@/features/mcp/mcp-consent-screen";
import { OAuthPageShell } from "@/features/mcp/oauth-page-shell";
import { UserCodeForm } from "@/features/mcp/user-code-form";
import { requireSession } from "@/lib/auth/require-session";

const searchSchema = z.object({ userCode: z.string().optional() });

export const Route = createFileRoute("/connect-application")({
  beforeLoad: requireSession,
  validateSearch: searchSchema,
  component: ConnectApplicationPage,
});

function ConsentByUserCode({ userCode }: { userCode: string }) {
  const { t } = useLingui();
  const { data, isLoading, isError } = $api.useQuery(
    "get",
    "/me/mcp/authorize/by-user-code/{user_code}",
    { params: { path: { user_code: userCode } } }
  );
  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 4 }} />;
  }
  if (isError || !data) {
    return (
      <Result
        status="warning"
        subTitle={t`Ce code est invalide ou a expiré.`}
        title={t`Code invalide`}
      />
    );
  }
  return <MCPConsentScreen request={data.item} />;
}

function ConnectApplicationPage() {
  const { userCode } = Route.useSearch();
  return (
    <OAuthPageShell>
      {userCode ? <ConsentByUserCode userCode={userCode} /> : <UserCodeForm />}
    </OAuthPageShell>
  );
}
