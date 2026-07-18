// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { EditOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Flex, Tooltip } from "antd";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import {
  OverviewField,
  OverviewFields,
} from "@/components/overview/overview-fields";
import { OverviewHeader } from "@/components/overview/overview-header";
import { ApplicationFormModal } from "@/features/applications/application-form-modal";
import {
  ApplicationStatusTag,
  ApplicationTypeTag,
} from "@/features/applications/application-tags";
import { LockToggleButton } from "@/features/lock/lock-toggle-button";
import { useCanManageLock } from "@/features/lock/use-can-manage-lock";

type Application = components["schemas"]["ApplicationItem"];

export function ApplicationOverview({
  accountId,
  application,
}: {
  accountId: string;
  application: Application;
}) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const statusMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/applications/{application_id}",
    { meta: { successMessage: t`Statut mis à jour` } }
  );
  const typeMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/applications/{application_id}",
    { meta: { successMessage: t`Type mis à jour` } }
  );
  const lockMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/applications/{application_id}/lock",
    { meta: { successMessage: t`Application verrouillée` } }
  );
  const unlockMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/applications/{application_id}/unlock",
    { meta: { successMessage: t`Application déverrouillée` } }
  );

  const canManageLock = useCanManageLock(accountId);
  const lockPending = lockMutation.isPending || unlockMutation.isPending;

  async function toggleLock() {
    const mutation = application.locked ? unlockMutation : lockMutation;
    await mutation.mutateAsync({
      params: {
        path: { account_id: accountId, application_id: application.id },
      },
    });
    queryClient.invalidateQueries({
      queryKey: [
        "get",
        "/v1/accounts/{account_id}/applications/{application_id}",
      ],
    });
    queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}/applications"],
    });
  }

  async function changeStatus(status: Application["status"]) {
    await statusMutation.mutateAsync({
      params: {
        path: { account_id: accountId, application_id: application.id },
      },
      body: { status },
    });
    queryClient.invalidateQueries({
      queryKey: [
        "get",
        "/v1/accounts/{account_id}/applications/{application_id}",
      ],
    });
    queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}/applications"],
    });
  }

  async function changeType(type: Application["type"]) {
    await typeMutation.mutateAsync({
      params: {
        path: { account_id: accountId, application_id: application.id },
      },
      body: { type },
    });
    queryClient.invalidateQueries({
      queryKey: [
        "get",
        "/v1/accounts/{account_id}/applications/{application_id}",
      ],
    });
    queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}/applications"],
    });
  }

  return (
    <Flex gap={16} vertical>
      <OverviewHeader
        actions={
          <Flex gap={8}>
            {canManageLock ? (
              <LockToggleButton
                locked={application.locked}
                onToggle={toggleLock}
                pending={lockPending}
                size="middle"
              />
            ) : null}
            <Tooltip
              title={application.locked ? t`Application verrouillée` : ""}
            >
              <Button
                disabled={application.locked}
                icon={<EditOutlined />}
                onClick={() => setEditOpen(true)}
              >
                {t`Modifier`}
              </Button>
            </Tooltip>
          </Flex>
        }
        date={application.date}
        owner={application.owner}
        statusDate={application.statusDate}
        title={t`Vue d'ensemble`}
      />

      <OverviewFields>
        <OverviewField label={t`Titre`}>{application.title}</OverviewField>
        <OverviewField label={t`Type`}>
          <ApplicationTypeTag
            loading={typeMutation.isPending}
            onChange={application.locked ? undefined : changeType}
            type={application.type}
          />
        </OverviewField>
        <OverviewField label={t`Statut`}>
          <ApplicationStatusTag
            loading={statusMutation.isPending}
            onChange={application.locked ? undefined : changeStatus}
            status={application.status}
          />
        </OverviewField>
        <OverviewField full label={t`Description`}>
          {application.description || "—"}
        </OverviewField>
      </OverviewFields>

      <ApplicationFormModal
        accountId={accountId}
        application={application}
        onClose={() => setEditOpen(false)}
        open={editOpen}
      />
    </Flex>
  );
}
