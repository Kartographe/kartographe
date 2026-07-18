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
import { EditablePersonasCell } from "@/features/journeys/editable-personas-cell";
import { JourneyFormModal } from "@/features/journeys/journey-form-modal";
import {
  JourneyStatusTag,
  JourneyTypeTag,
} from "@/features/journeys/journey-tags";
import { LockToggleButton } from "@/features/lock/lock-toggle-button";
import { useCanManageLock } from "@/features/lock/use-can-manage-lock";
import { EditableTagsCell } from "@/features/tags/editable-tags-cell";
import { RichTextView } from "@/lib/rich-text/rich-text-view";

type Journey = components["schemas"]["JourneyItem"];

export function JourneyOverview({
  accountId,
  journey,
}: {
  accountId: string;
  journey: Journey;
}) {
  const { t } = useLingui();
  const { modal } = App.useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

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
  const tagsMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/journeys/{journey_id}",
    { meta: { successMessage: t`Tags mis à jour` } }
  );
  const personasMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/journeys/{journey_id}",
    { meta: { successMessage: t`Personas mis à jour` } }
  );
  const deleteMutation = $api.useMutation(
    "delete",
    "/v1/accounts/{account_id}/journeys/{journey_id}",
    { meta: { successMessage: t`Parcours supprimé` } }
  );
  const lockMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/journeys/{journey_id}/lock",
    { meta: { successMessage: t`Parcours verrouillé` } }
  );
  const unlockMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/journeys/{journey_id}/unlock",
    { meta: { successMessage: t`Parcours déverrouillé` } }
  );

  const canManageLock = useCanManageLock(accountId);
  const lockPending = lockMutation.isPending || unlockMutation.isPending;

  async function toggleLock() {
    const mutation = journey.locked ? unlockMutation : lockMutation;
    await mutation.mutateAsync({
      params: { path: { account_id: accountId, journey_id: journey.id } },
    });
    invalidate();
  }

  async function changeStatus(status: Journey["status"]) {
    await statusMutation.mutateAsync({
      params: { path: { account_id: accountId, journey_id: journey.id } },
      body: { status },
    });
    invalidate();
  }

  async function changeType(type: Journey["type"]) {
    await typeMutation.mutateAsync({
      params: { path: { account_id: accountId, journey_id: journey.id } },
      body: { type },
    });
    invalidate();
  }

  async function changeTags(tagIds: string[]) {
    await tagsMutation.mutateAsync({
      params: { path: { account_id: accountId, journey_id: journey.id } },
      body: { tagIds },
    });
    invalidate();
  }

  async function changePersonas(personasIds: string[]) {
    await personasMutation.mutateAsync({
      params: { path: { account_id: accountId, journey_id: journey.id } },
      body: { personasIds },
    });
    invalidate();
  }

  function invalidate() {
    queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}/journeys/{journey_id}"],
    });
    queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}/journeys"],
    });
  }

  function confirmDelete() {
    modal.confirm({
      title: t`Supprimer ${journey.title} ?`,
      content: t`Ses scénarios et leurs étapes seront supprimés également. Cette action est irréversible.`,
      okText: t`Supprimer`,
      okButtonProps: { danger: true },
      cancelText: t`Annuler`,
      onOk: async () => {
        await deleteMutation.mutateAsync({
          params: { path: { account_id: accountId, journey_id: journey.id } },
        });
        queryClient.invalidateQueries({
          queryKey: ["get", "/v1/accounts/{account_id}/journeys"],
        });
        navigate({
          params: { accountId },
          to: "/accounts/$accountId/journeys",
        });
      },
    });
  }

  return (
    <Flex gap={16} vertical>
      <OverviewHeader
        actions={
          <Flex gap={8}>
            {canManageLock ? (
              <LockToggleButton
                locked={journey.locked}
                onToggle={toggleLock}
                pending={lockPending}
                size="middle"
              />
            ) : null}
            <Tooltip title={journey.locked ? t`Parcours verrouillé` : ""}>
              <Button
                disabled={journey.locked}
                icon={<EditOutlined />}
                onClick={() => setEditOpen(true)}
              >
                {t`Modifier`}
              </Button>
            </Tooltip>
            <Tooltip
              title={journey.locked ? t`Parcours verrouillé` : t`Supprimer`}
            >
              <Button
                danger
                disabled={journey.locked}
                icon={<DeleteOutlined />}
                onClick={confirmDelete}
              />
            </Tooltip>
          </Flex>
        }
        date={journey.date}
        owner={journey.owner}
        statusDate={journey.statusDate}
        title={t`Informations`}
      />

      <OverviewFields>
        <OverviewField label={t`Titre`}>{journey.title}</OverviewField>
        <OverviewField label={t`Type`}>
          <JourneyTypeTag
            loading={typeMutation.isPending}
            onChange={journey.locked ? undefined : changeType}
            type={journey.type}
          />
        </OverviewField>
        <OverviewField label={t`Statut`}>
          <JourneyStatusTag
            loading={statusMutation.isPending}
            onChange={journey.locked ? undefined : changeStatus}
            status={journey.status}
          />
        </OverviewField>
        <OverviewField full label={t`Personas`}>
          <EditablePersonasCell
            accountId={accountId}
            loading={personasMutation.isPending}
            onChange={changePersonas}
            readOnly={journey.locked}
            value={journey.personasIds}
          />
        </OverviewField>
        <OverviewField full label={t`Tags`}>
          <EditableTagsCell
            accountId={accountId}
            entityType="journey"
            loading={tagsMutation.isPending}
            onChange={changeTags}
            readOnly={journey.locked}
            tags={journey.tags}
            value={journey.tagIds}
          />
        </OverviewField>
        <OverviewField full label={t`Description`}>
          <RichTextView value={journey.description} />
        </OverviewField>
      </OverviewFields>

      <JourneyFormModal
        accountId={accountId}
        journey={journey}
        onClose={() => setEditOpen(false)}
        open={editOpen}
      />
    </Flex>
  );
}
