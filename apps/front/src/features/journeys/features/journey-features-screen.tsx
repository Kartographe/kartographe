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
import {
  FeatureStatusTag,
  FeatureTypeTag,
} from "@/features/features/feature-tags";
import { LinkFeatureModal } from "@/features/journeys/features/link-feature-modal";

type JourneyFeature = components["schemas"]["JourneyFeatureItem"];
type Feature = components["schemas"]["FeatureRef"];

const LIST_KEY = [
  "get",
  "/v1/accounts/{account_id}/journeys/{journey_id}/features",
];
/** The type/status shown here belong to the feature, edited in place from here. */
const FEATURES_KEY = ["get", "/v1/accounts/{account_id}/features"];

export function JourneyFeaturesScreen({
  accountId,
  journeyId,
}: {
  accountId: string;
  journeyId: string;
}) {
  const { t } = useLingui();
  const { modal } = App.useApp();
  const queryClient = useQueryClient();
  const [linkOpen, setLinkOpen] = useState(false);

  const path = { account_id: accountId, journey_id: journeyId };

  const linksQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/journeys/{journey_id}/features",
    { params: { path } }
  );
  const deleteMutation = $api.useMutation(
    "delete",
    "/v1/accounts/{account_id}/journeys/{journey_id}/features/{feature_journey_id}",
    { meta: { successMessage: t`Fonctionnalité détachée` } }
  );
  const statusMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/features/{feature_id}",
    { meta: { successMessage: t`Statut mis à jour` } }
  );
  const typeMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/features/{feature_id}",
    { meta: { successMessage: t`Type mis à jour` } }
  );

  const links = linksQuery.data?.items ?? [];
  const linkedIds = new Set(links.map((link) => link.featureId));

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: LIST_KEY });
  }

  /** The edited feature is shown from the link listing — refresh both. */
  function invalidateFeature() {
    invalidate();
    queryClient.invalidateQueries({ queryKey: FEATURES_KEY });
  }

  async function changeStatus(feature: Feature, status: Feature["status"]) {
    await statusMutation.mutateAsync({
      params: { path: { account_id: accountId, feature_id: feature.id } },
      body: { status },
    });
    invalidateFeature();
  }

  async function changeType(feature: Feature, type: Feature["type"]) {
    await typeMutation.mutateAsync({
      params: { path: { account_id: accountId, feature_id: feature.id } },
      body: { type },
    });
    invalidateFeature();
  }

  function confirmUnlink(link: JourneyFeature) {
    modal.confirm({
      title: t`Détacher ${link.feature.title} ?`,
      content: t`La fonctionnalité elle-même n'est pas supprimée, seul le lien avec ce parcours disparaît.`,
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
      {t`Lier une fonctionnalité`}
    </Button>
  );

  const linkModal = (
    <LinkFeatureModal
      accountId={accountId}
      journeyId={journeyId}
      key={linkOpen ? "open" : "closed"}
      linkedIds={linkedIds}
      onClose={() => setLinkOpen(false)}
      open={linkOpen}
    />
  );

  const columns: TableProps<JourneyFeature>["columns"] = [
    {
      title: t`Fonctionnalité`,
      key: "feature",
      width: COL.title,
      ellipsis: true,
      render: (_, link) => (
        <Typography.Text strong>{link.feature.title}</Typography.Text>
      ),
    },
    {
      title: t`Type`,
      key: "type",
      width: COL.type,
      render: (_, link) => (
        <FeatureTypeTag
          loading={typeMutation.isPending}
          onChange={(next) => changeType(link.feature, next)}
          type={link.feature.type}
        />
      ),
    },
    {
      title: t`Statut`,
      key: "status",
      width: COL.status,
      render: (_, link) => (
        <FeatureStatusTag
          loading={statusMutation.isPending}
          onChange={(next) => changeStatus(link.feature, next)}
          status={link.feature.status}
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
            params={{ accountId, featureId: link.feature.id }}
            to="/accounts/$accountId/features/$featureId"
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
          {t`Fonctionnalités`}
        </Typography.Title>
        <Empty
          description={t`Aucune fonctionnalité liée. Rattachez celles que ce parcours met en œuvre.`}
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
          {t`Fonctionnalités`}
        </Typography.Title>
        {linkButton}
      </Flex>

      <Table<JourneyFeature>
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
