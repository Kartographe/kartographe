// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { App, Button, Flex, Tooltip } from "antd";
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
import { LockToggleButton } from "@/features/lock/lock-toggle-button";
import { useCanManageLock } from "@/features/lock/use-can-manage-lock";
import { EditableTagsCell } from "@/features/tags/editable-tags-cell";
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
  const { modal } = App.useApp();
  const navigate = useNavigate();
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
  const tagsMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/features/{feature_id}",
    { meta: { successMessage: t`Tags mis à jour` } }
  );
  const deleteMutation = $api.useMutation(
    "delete",
    "/v1/accounts/{account_id}/features/{feature_id}",
    { meta: { successMessage: t`Fonctionnalité supprimée` } }
  );
  const lockMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/features/{feature_id}/lock",
    { meta: { successMessage: t`Fonctionnalité verrouillée` } }
  );
  const unlockMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/features/{feature_id}/unlock",
    { meta: { successMessage: t`Fonctionnalité déverrouillée` } }
  );

  const canManageLock = useCanManageLock(accountId);
  const lockPending = lockMutation.isPending || unlockMutation.isPending;

  async function toggleLock() {
    const mutation = feature.locked ? unlockMutation : lockMutation;
    await mutation.mutateAsync({
      params: { path: { account_id: accountId, feature_id: feature.id } },
    });
    queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}/features/{feature_id}"],
    });
    queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}/features"],
    });
  }

  function confirmDelete() {
    modal.confirm({
      title: t`Supprimer ${feature.title} ?`,
      content: t`Ses fichiers et ses liens vers les parcours seront supprimés également. Cette action est irréversible.`,
      okText: t`Supprimer`,
      okButtonProps: { danger: true },
      cancelText: t`Annuler`,
      onOk: async () => {
        await deleteMutation.mutateAsync({
          params: { path: { account_id: accountId, feature_id: feature.id } },
        });
        queryClient.invalidateQueries({
          queryKey: ["get", "/v1/accounts/{account_id}/features"],
        });
        navigate({
          params: { accountId },
          to: "/accounts/$accountId/features",
        });
      },
    });
  }

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

  async function changeTags(tagIds: string[]) {
    await tagsMutation.mutateAsync({
      params: { path: { account_id: accountId, feature_id: feature.id } },
      body: { tagIds },
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
          <Flex gap={8}>
            {canManageLock ? (
              <LockToggleButton
                locked={feature.locked}
                onToggle={toggleLock}
                pending={lockPending}
                size="middle"
              />
            ) : null}
            <Tooltip
              title={feature.locked ? t`Fonctionnalité verrouillée` : ""}
            >
              <Button
                disabled={feature.locked}
                icon={<EditOutlined />}
                onClick={() => setEditOpen(true)}
              >
                {t`Modifier`}
              </Button>
            </Tooltip>
            <Tooltip
              title={
                feature.locked ? t`Fonctionnalité verrouillée` : t`Supprimer`
              }
            >
              <Button
                danger
                disabled={feature.locked}
                icon={<DeleteOutlined />}
                onClick={confirmDelete}
              />
            </Tooltip>
          </Flex>
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
            onChange={feature.locked ? undefined : changeType}
            type={feature.type}
          />
        </OverviewField>
        <OverviewField label={t`Statut`}>
          <FeatureStatusTag
            loading={statusMutation.isPending}
            onChange={feature.locked ? undefined : changeStatus}
            status={feature.status}
          />
        </OverviewField>
        <OverviewField full label={t`Tags`}>
          <EditableTagsCell
            accountId={accountId}
            entityType="feature"
            loading={tagsMutation.isPending}
            onChange={changeTags}
            readOnly={feature.locked}
            tags={feature.tags}
            value={feature.tagIds}
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
