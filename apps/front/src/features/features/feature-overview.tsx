// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { EditOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Flex } from "antd";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import {
  OverviewField,
  OverviewFields,
} from "@/components/overview/overview-fields";
import { OverviewHeader } from "@/components/overview/overview-header";
import { FeatureFormModal } from "@/features/features/feature-form-modal";
import {
  FeatureStatusTag,
  FeatureTypeTag,
} from "@/features/features/feature-tags";
import { RichTextView } from "@/lib/rich-text/rich-text-view";

type Feature = components["schemas"]["FeatureItem"];

export function FeatureOverview({
  accountId,
  feature,
}: {
  accountId: string;
  feature: Feature;
}) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

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

  async function changeStatus(status: Feature["status"]) {
    await statusMutation.mutateAsync({
      params: { path: { account_id: accountId, feature_id: feature.id } },
      body: { status },
    });
    queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}/features/{feature_id}"],
    });
    queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}/features"],
    });
  }

  async function changeType(type: Feature["type"]) {
    await typeMutation.mutateAsync({
      params: { path: { account_id: accountId, feature_id: feature.id } },
      body: { type },
    });
    queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}/features/{feature_id}"],
    });
    queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}/features"],
    });
  }

  return (
    <Flex gap={16} vertical>
      <OverviewHeader
        actions={
          <Button icon={<EditOutlined />} onClick={() => setEditOpen(true)}>
            {t`Modifier`}
          </Button>
        }
        date={feature.date}
        owner={feature.owner}
        statusDate={feature.statusDate}
        title={t`Informations`}
      />

      <OverviewFields>
        <OverviewField label={t`Titre`}>{feature.title}</OverviewField>
        <OverviewField label={t`Type`}>
          <FeatureTypeTag
            loading={typeMutation.isPending}
            onChange={changeType}
            type={feature.type}
          />
        </OverviewField>
        <OverviewField label={t`Statut`}>
          <FeatureStatusTag
            loading={statusMutation.isPending}
            onChange={changeStatus}
            status={feature.status}
          />
        </OverviewField>
        <OverviewField full label={t`Description`}>
          <RichTextView value={feature.description} />
        </OverviewField>
      </OverviewFields>

      <FeatureFormModal
        accountId={accountId}
        feature={feature}
        onClose={() => setEditOpen(false)}
        open={editOpen}
      />
    </Flex>
  );
}
