// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { DeleteOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { App, Button, Flex, Tooltip } from "antd";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { InlineEditRichText } from "@/components/overview/inline-edit-rich-text";
import { InlineEditText } from "@/components/overview/inline-edit-text";
import {
  OverviewField,
  OverviewFields,
} from "@/components/overview/overview-fields";
import { OverviewHeader } from "@/components/overview/overview-header";
import {
  FeatureStatusTag,
  FeatureTypeTag,
} from "@/features/features/feature-tags";
import { LockToggleButton } from "@/features/lock/lock-toggle-button";
import { useCanManageLock } from "@/features/lock/use-can-manage-lock";
import { EditableTagsCell } from "@/features/tags/editable-tags-cell";
import type { RichTextDocument } from "@/lib/rich-text/rich-text";

type Feature = components["schemas"]["FeatureItem"];

const ENTITY_KEY = ["get", "/v1/accounts/{account_id}/features/{feature_id}"];
const LIST_KEY = ["get", "/v1/accounts/{account_id}/features"];

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

  const updateMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/features/{feature_id}",
    { meta: { successMessage: t`Fonctionnalité mise à jour` } }
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

  function invalidateEntity() {
    queryClient.invalidateQueries({ queryKey: ENTITY_KEY });
    queryClient.invalidateQueries({ queryKey: LIST_KEY });
  }

  const path = { account_id: accountId, feature_id: feature.id };

  async function toggleLock() {
    const mutation = feature.locked ? unlockMutation : lockMutation;
    await mutation.mutateAsync({ params: { path } });
    invalidateEntity();
  }

  function confirmDelete() {
    modal.confirm({
      title: t`Supprimer ${feature.title} ?`,
      content: t`Ses fichiers et ses liens vers les parcours seront supprimés également. Cette action est irréversible.`,
      okText: t`Supprimer`,
      okButtonProps: { danger: true },
      cancelText: t`Annuler`,
      onOk: async () => {
        await deleteMutation.mutateAsync({ params: { path } });
        queryClient.invalidateQueries({ queryKey: LIST_KEY });
        navigate({
          params: { accountId },
          to: "/accounts/$accountId/features",
        });
      },
    });
  }

  async function saveTitle(title: string) {
    await updateMutation.mutateAsync({ params: { path }, body: { title } });
    invalidateEntity();
  }

  async function saveDescription(description: RichTextDocument) {
    await updateMutation.mutateAsync({
      params: { path },
      body: { description },
    });
    invalidateEntity();
  }

  async function changeStatus(status: Feature["status"]) {
    await statusMutation.mutateAsync({ params: { path }, body: { status } });
    invalidateEntity();
  }

  async function changeType(type: Feature["type"]) {
    await typeMutation.mutateAsync({ params: { path }, body: { type } });
    invalidateEntity();
  }

  async function changeTags(tagIds: string[]) {
    await tagsMutation.mutateAsync({ params: { path }, body: { tagIds } });
    invalidateEntity();
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
        <InlineEditText
          disabled={feature.locked}
          label={t`Titre`}
          onSave={saveTitle}
          value={feature.title}
        />
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
        {feature.locked && feature.tagIds.length === 0 ? null : (
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
        )}
        <InlineEditRichText
          disabled={feature.locked}
          full
          label={t`Description`}
          onSave={saveDescription}
          value={feature.description}
        />
      </OverviewFields>
    </Flex>
  );
}
