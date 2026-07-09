import { DisconnectOutlined, PlusOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { App, Button, Empty, Flex, List, Tooltip, Typography } from "antd";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { MethodTag } from "@/components/method-tag";
import { LinkRouteModal } from "@/features/journeys/steps/link-route-modal";

type StepRoute = components["schemas"]["JourneyScenarioStepRouteItem"];
type ApplicationRoute = components["schemas"]["ApplicationRouteItem"];

const LIST_KEY = [
  "get",
  "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}/steps/{step_id}/routes",
];

/**
 * Resolves the routes a step links to.
 *
 * A link carries an `applicationId` and an `applicationRouteId`, nothing more —
 * and a route is only listed under its own application, so the lookup is one
 * query per distinct application rather than one per link.
 */
function useRouteLookup(accountId: string, applicationIds: string[]) {
  const uniqueIds = [...new Set(applicationIds)];

  const queries = useQueries({
    queries: uniqueIds.map((applicationId) =>
      $api.queryOptions(
        "get",
        "/v1/accounts/{account_id}/applications/{application_id}/routes",
        {
          params: {
            path: { account_id: accountId, application_id: applicationId },
          },
        }
      )
    ),
  });

  const byApplication = new Map<string, Map<string, ApplicationRoute>>();
  uniqueIds.forEach((applicationId, index) => {
    const routes = queries[index]?.data?.items ?? [];
    byApplication.set(
      applicationId,
      new Map(routes.map((route) => [route.id, route]))
    );
  });

  return {
    isLoading: queries.some((query) => query.isLoading),
    route: (applicationId: string, routeId: string) =>
      byApplication.get(applicationId)?.get(routeId) ?? null,
  };
}

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
  const routes = useRouteLookup(
    accountId,
    links.map((link) => link.applicationId)
  );

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
          loading={linksQuery.isLoading || routes.isLoading}
          renderItem={(link) => {
            const route = routes.route(
              link.applicationId,
              link.applicationRouteId
            );
            return (
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
                {route ? (
                  <Flex align="center" gap={8} style={{ minWidth: 0 }}>
                    <MethodTag method={route.method} />
                    <Typography.Text code ellipsis>
                      {route.path}
                    </Typography.Text>
                  </Flex>
                ) : (
                  // Archived out of the listing, or deleted from its application.
                  <Typography.Text type="secondary">{t`Route introuvable`}</Typography.Text>
                )}
              </List.Item>
            );
          }}
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
