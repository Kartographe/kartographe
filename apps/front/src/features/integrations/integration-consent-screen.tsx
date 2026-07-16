// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { Alert, Button, Flex, Radio, Result, Typography } from "antd";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";

type AuthorizationRequest =
  components["schemas"]["MeIntegrationAuthorizationRequestItem"];
type Scope = components["schemas"]["OauthGrantScope"];

interface IntegrationConsentScreenProps {
  request: AuthorizationRequest;
  onSettled?: () => void;
}

export function IntegrationConsentScreen({
  request,
  onSettled,
}: IntegrationConsentScreenProps) {
  const { t } = useLingui();
  const [scope, setScope] = useState<Scope>(request.requestedScope);
  const [outcome, setOutcome] = useState<"approved" | "denied" | null>(null);

  const approveMutation = $api.useMutation(
    "post",
    "/me/integrations/authorize/{request_id}/approve",
    { meta: { noErrorToast: true } }
  );
  const denyMutation = $api.useMutation(
    "post",
    "/me/integrations/authorize/{request_id}/deny",
    { meta: { noErrorToast: true } }
  );

  async function approve() {
    const data = await approveMutation.mutateAsync({
      params: { path: { request_id: request.id } },
      body: { scope },
    });
    if (data.item.redirectUrl) {
      window.location.assign(data.item.redirectUrl);
      return;
    }
    setOutcome("approved");
    onSettled?.();
  }

  async function deny() {
    const data = await denyMutation.mutateAsync({
      params: { path: { request_id: request.id } },
    });
    if (data.item.redirectUrl) {
      window.location.assign(data.item.redirectUrl);
      return;
    }
    setOutcome("denied");
    onSettled?.();
  }

  if (outcome === "approved") {
    return (
      <Result
        status="success"
        subTitle={t`Vous pouvez revenir à l'intégration.`}
        title={t`Accès autorisé`}
      />
    );
  }
  if (outcome === "denied") {
    return (
      <Result
        status="info"
        subTitle={t`Aucun accès n'a été accordé.`}
        title={t`Demande refusée`}
      />
    );
  }

  return (
    <Flex gap={20} vertical>
      <div>
        <Typography.Title level={4} style={{ marginBottom: 4 }}>
          {t`Autoriser ${request.clientName}`}
        </Typography.Title>
        <Typography.Text type="secondary">
          {t`Cette intégration demande l'accès à votre compte Kartographe.`}
        </Typography.Text>
      </div>

      <Radio.Group
        onChange={(event) => setScope(event.target.value)}
        value={scope}
      >
        <Flex gap={12} vertical>
          <Radio value="read">
            <Typography.Text strong>{t`Lecture seule`}</Typography.Text>
            <br />
            <Typography.Text type="secondary">
              {t`Consulter vos données, sans les modifier.`}
            </Typography.Text>
          </Radio>
          <Radio value="write">
            <Typography.Text strong>{t`Accès complet`}</Typography.Text>
            <br />
            <Typography.Text type="secondary">
              {t`Consulter et modifier vos données.`}
            </Typography.Text>
          </Radio>
        </Flex>
      </Radio.Group>

      <Alert
        message={t`N'autorisez que les intégrations de confiance. Vous pourrez révoquer l'accès à tout moment depuis votre compte.`}
        showIcon
        type="info"
      />

      <Flex gap={12} justify="flex-end">
        <Button loading={denyMutation.isPending} onClick={deny}>
          {t`Refuser`}
        </Button>
        <Button
          loading={approveMutation.isPending}
          onClick={approve}
          type="primary"
        >
          {t`Autoriser`}
        </Button>
      </Flex>
    </Flex>
  );
}
