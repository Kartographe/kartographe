// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { DisconnectOutlined, PlusOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { App, Button, Empty, Flex, List, Tooltip, Typography } from "antd";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { MethodTag } from "@/components/method-tag";
import { LinkRouteModal } from "@/features/journeys/steps/link-route-modal";

type StepRoute = components["schemas"]["JourneyScenarioStepRouteItem"];

const LIST_KEY = [
  "get",
  "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}/steps/{step_id}/routes",
];

export function StepRoutes({
  accountId,
  journeyId,
  scenarioId,
  stepId,
}: {
  accountId: string;
  journeyId: string;
  scenarioId: string;
  stepId: string;
}) {
  const { t } = useLingui();
  const { modal } = App.useApp();
  const queryClient = useQueryClient();
  const [linkOpen, setLinkOpen] = useState(false);

  const path = {
    account_id: accountId,
    journey_id: journeyId,
    scenario_id: scenarioId,
    step_id: stepId,
  };

  const linksQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}/steps/{step_id}/routes",
    { params: { path } }
  );
  const deleteMutation = $api.useMutation(
    "delete",
    "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}/steps/{step_id}/routes/{step_route_id}",
    { meta: { successMessage: t`Route détachée` } }
  );

  const links = linksQuery.data?.items ?? [];

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: LIST_KEY });
  }

  function confirmUnlink(link: StepRoute) {
    modal.confirm({
      title: t`Détacher cette route ?`,
      content: t`La route elle-même n'est pas supprimée, seul le lien avec cette étape disparaît.`,
      okText: t`Détacher`,
      okButtonProps: { danger: true },
      cancelText: t`Annuler`,
      onOk: async () => {
        await deleteMutation.mutateAsync({
          params: { path: { ...path, step_route_id: link.id } },
        });
        invalidate();
      },
    });
  }

  return (
    <Flex gap={12} vertical>
      <Flex align="center" justify="space-between">
        <Typography.Text strong>{t`Routes`}</Typography.Text>
        <Button
          icon={<PlusOutlined />}
          onClick={() => setLinkOpen(true)}
          size="small"
        >
          {t`Lier une route`}
        </Button>
      </Flex>

      {links.length === 0 && !linksQuery.isLoading ? (
        <Empty
          description={t`Aucune route liée à cette étape`}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <List
          dataSource={links}
          loading={linksQuery.isLoading}
          renderItem={(link) => (
            <List.Item
              actions={[
                <Tooltip key="unlink" title={t`Détacher`}>
                  <Button
                    danger
                    icon={<DisconnectOutlined />}
                    onClick={() => confirmUnlink(link)}
                    size="small"
                  />
                </Tooltip>,
              ]}
            >
              <Flex align="center" gap={8} style={{ minWidth: 0 }}>
                <MethodTag method={link.route.method} />
                <Typography.Text code ellipsis>
                  {link.route.path}
                </Typography.Text>
              </Flex>
            </List.Item>
          )}
          size="small"
        />
      )}

      <LinkRouteModal
        accountId={accountId}
        journeyId={journeyId}
        key={linkOpen ? "open" : "closed"}
        onClose={() => setLinkOpen(false)}
        open={linkOpen}
        scenarioId={scenarioId}
        stepId={stepId}
      />
    </Flex>
  );
}
