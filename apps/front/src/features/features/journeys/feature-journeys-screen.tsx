// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import {
  ArrowRightOutlined,
  DisconnectOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { TableProps } from "antd";
import {
  App,
  Button,
  Empty,
  Flex,
  Space,
  Table,
  Tooltip,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { actionsWidth, COL, scrollX } from "@/components/table/columns";
import { OwnerCell } from "@/features/accounts/owner-cell";
import { LinkJourneyModal } from "@/features/features/journeys/link-journey-modal";
import {
  JourneyStatusTag,
  JourneyTypeTag,
} from "@/features/journeys/journey-tags";

type FeatureJourney = components["schemas"]["FeatureJourneyItem"];
type Journey = components["schemas"]["JourneyRef"];

const LIST_KEY = [
  "get",
  "/v1/accounts/{account_id}/features/{feature_id}/journeys",
];
/** The type/status shown here belong to the journey, edited in place from here. */
const JOURNEYS_KEY = ["get", "/v1/accounts/{account_id}/journeys"];

export function FeatureJourneysScreen({
  accountId,
  featureId,
}: {
  accountId: string;
  featureId: string;
}) {
  const { t } = useLingui();
  const { modal } = App.useApp();
  const queryClient = useQueryClient();
  const [linkOpen, setLinkOpen] = useState(false);

  const path = { account_id: accountId, feature_id: featureId };

  const linksQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/features/{feature_id}/journeys",
    { params: { path } }
  );
  const deleteMutation = $api.useMutation(
    "delete",
    "/v1/accounts/{account_id}/features/{feature_id}/journeys/{feature_journey_id}",
    { meta: { successMessage: t`Parcours détaché` } }
  );
  const statusMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/journeys/{journey_id}",
    { meta: { successMessage: t`Statut mis à jour` } }
  );
  const typeMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/journeys/{journey_id}",
    { meta: { successMessage: t`Type mis à jour` } }
  );

  const links = linksQuery.data?.items ?? [];
  const linkedIds = new Set(links.map((link) => link.journeyId));

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: LIST_KEY });
  }

  /** The edited journey is shown from the link listing — refresh both. */
  function invalidateJourney() {
    invalidate();
    queryClient.invalidateQueries({ queryKey: JOURNEYS_KEY });
  }

  async function changeStatus(journey: Journey, status: Journey["status"]) {
    await statusMutation.mutateAsync({
      params: { path: { account_id: accountId, journey_id: journey.id } },
      body: { status },
    });
    invalidateJourney();
  }

  async function changeType(journey: Journey, type: Journey["type"]) {
    await typeMutation.mutateAsync({
      params: { path: { account_id: accountId, journey_id: journey.id } },
      body: { type },
    });
    invalidateJourney();
  }

  function confirmUnlink(link: FeatureJourney) {
    modal.confirm({
      title: t`Détacher ${link.journey.title} ?`,
      content: t`Le parcours lui-même n'est pas supprimé, seul le lien avec cette fonctionnalité disparaît.`,
      okText: t`Détacher`,
      okButtonProps: { danger: true },
      cancelText: t`Annuler`,
      onOk: async () => {
        await deleteMutation.mutateAsync({
          params: { path: { ...path, feature_journey_id: link.id } },
        });
        invalidate();
      },
    });
  }

  const linkButton = (
    <Button
      icon={<PlusOutlined />}
      onClick={() => setLinkOpen(true)}
      type="primary"
    >
      {t`Lier un parcours`}
    </Button>
  );

  const linkModal = (
    <LinkJourneyModal
      accountId={accountId}
      featureId={featureId}
      key={linkOpen ? "open" : "closed"}
      linkedIds={linkedIds}
      onClose={() => setLinkOpen(false)}
      open={linkOpen}
    />
  );

  const columns: TableProps<FeatureJourney>["columns"] = [
    {
      title: t`Parcours`,
      key: "journey",
      width: COL.title,
      ellipsis: true,
      render: (_, link) => (
        <Typography.Text strong>{link.journey.title}</Typography.Text>
      ),
    },
    {
      title: t`Type`,
      key: "type",
      width: COL.type,
      render: (_, link) => (
        <JourneyTypeTag
          loading={typeMutation.isPending}
          onChange={(next) => changeType(link.journey, next)}
          type={link.journey.type}
        />
      ),
    },
    {
      title: t`Statut`,
      key: "status",
      width: COL.status,
      render: (_, link) => (
        <JourneyStatusTag
          loading={statusMutation.isPending}
          onChange={(next) => changeStatus(link.journey, next)}
          status={link.journey.status}
        />
      ),
    },
    {
      title: t`Lien`,
      key: "owner",
      dataIndex: "owner",
      width: COL.text,
      render: (_owner, link) => (
        <Flex style={{ minWidth: 0 }} vertical>
          <OwnerCell owner={link.owner} size={20} />
          <Typography.Text style={{ fontSize: 12 }} type="secondary">
            {link.date ? t`le ${dayjs(link.date).format("DD/MM/YYYY")}` : "—"}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: "",
      key: "actions",
      align: "right",
      fixed: "right",
      width: actionsWidth({ icons: 1, labelled: 1 }),
      render: (_, link) => (
        <Space>
          <Link
            params={{ accountId, journeyId: link.journey.id }}
            to="/accounts/$accountId/journeys/$journeyId"
          >
            <Button
              icon={<ArrowRightOutlined />}
              iconPosition="end"
              size="small"
            >
              {t`Accéder`}
            </Button>
          </Link>
          <Tooltip title={t`Détacher`}>
            <Button
              danger
              icon={<DisconnectOutlined />}
              onClick={() => confirmUnlink(link)}
              size="small"
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  if (!linksQuery.isLoading && links.length === 0) {
    return (
      <Flex gap={16} vertical>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {t`Parcours utilisateur`}
        </Typography.Title>
        <Empty
          description={t`Aucun parcours lié. Rattachez les parcours que cette fonctionnalité sert.`}
        >
          {linkButton}
        </Empty>
        {linkModal}
      </Flex>
    );
  }

  return (
    <Flex gap={16} vertical>
      <Flex align="center" justify="space-between">
        <Typography.Title level={4} style={{ margin: 0 }}>
          {t`Parcours utilisateur`}
        </Typography.Title>
        {linkButton}
      </Flex>

      <Table<FeatureJourney>
        columns={columns}
        dataSource={links}
        loading={linksQuery.isLoading}
        pagination={false}
        rowKey="id"
        scroll={scrollX(columns)}
        size="small"
      />

      {linkModal}
    </Flex>
  );
}
