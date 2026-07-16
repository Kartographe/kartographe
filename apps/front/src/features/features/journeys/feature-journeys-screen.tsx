// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { DisconnectOutlined, PlusOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
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
import { useAccountUserMap } from "@/features/accounts/use-account-user-map";
import { LinkJourneyModal } from "@/features/features/journeys/link-journey-modal";
import {
  JourneyStatusTag,
  JourneyTypeTag,
} from "@/features/journeys/journey-tags";

type FeatureJourney = components["schemas"]["FeatureJourneyItem"];

const LIST_KEY = [
  "get",
  "/v1/accounts/{account_id}/features/{feature_id}/journeys",
];

/** Matches the link modal's picker: an account with more journeys pages beyond it. */
const JOURNEYS_LIMIT = 100;

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
  const users = useAccountUserMap(accountId);
  const [linkOpen, setLinkOpen] = useState(false);

  const path = { account_id: accountId, feature_id: featureId };

  const linksQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/features/{feature_id}/journeys",
    { params: { path } }
  );
  // The link carries only a `journeyId`; the journey itself is read from the
  // account's listing.
  const journeysQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/journeys",
    {
      params: {
        path: { account_id: accountId },
        query: { limit: JOURNEYS_LIMIT },
      },
    }
  );
  const deleteMutation = $api.useMutation(
    "delete",
    "/v1/accounts/{account_id}/features/{feature_id}/journeys/{feature_journey_id}",
    { meta: { successMessage: t`Parcours détaché` } }
  );

  const links = linksQuery.data?.items ?? [];
  const journeys = journeysQuery.data?.items ?? [];
  const journeyById = new Map(journeys.map((journey) => [journey.id, journey]));
  const linkedIds = new Set(links.map((link) => link.journeyId));
  const linkable = journeys.filter((journey) => !linkedIds.has(journey.id));

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: LIST_KEY });
  }

  function confirmUnlink(link: FeatureJourney) {
    const journey = journeyById.get(link.journeyId);
    modal.confirm({
      title: journey
        ? t`Détacher ${journey.title} ?`
        : t`Détacher ce parcours ?`,
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
      isLoading={journeysQuery.isLoading}
      journeys={linkable}
      key={linkOpen ? "open" : "closed"}
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
      render: (_, link) => {
        const journey = journeyById.get(link.journeyId);
        return journey ? (
          <Typography.Text strong>{journey.title}</Typography.Text>
        ) : (
          // Beyond the listing's page, or archived out of it.
          <Typography.Text type="secondary">{t`Parcours introuvable`}</Typography.Text>
        );
      },
    },
    {
      title: t`Type`,
      key: "type",
      width: COL.type,
      render: (_, link) => {
        const journey = journeyById.get(link.journeyId);
        return journey ? <JourneyTypeTag type={journey.type} /> : "—";
      },
    },
    {
      title: t`Statut`,
      key: "status",
      width: COL.status,
      render: (_, link) => {
        const journey = journeyById.get(link.journeyId);
        return journey ? <JourneyStatusTag status={journey.status} /> : "—";
      },
    },
    {
      title: t`Lié par`,
      key: "ownerId",
      dataIndex: "ownerId",
      width: COL.text,
      ellipsis: true,
      render: (ownerId: string) => users.name(ownerId),
    },
    {
      title: t`Lié le`,
      key: "date",
      dataIndex: "date",
      width: COL.date,
      render: (value: string | null) =>
        value ? dayjs(value).format("DD/MM/YYYY") : "—",
    },
    {
      title: "",
      key: "actions",
      align: "right",
      fixed: "right",
      width: actionsWidth({ icons: 1 }),
      render: (_, link) => (
        <Space>
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
