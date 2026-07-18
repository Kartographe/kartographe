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
import { ApplicationFormModal } from "@/features/applications/application-form-modal";
import {
  ApplicationStatusTag,
  ApplicationTypeTag,
} from "@/features/applications/application-tags";

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
          <Button icon={<EditOutlined />} onClick={() => setEditOpen(true)}>
            {t`Modifier`}
          </Button>
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
            onChange={changeType}
            type={application.type}
          />
        </OverviewField>
        <OverviewField label={t`Statut`}>
          <ApplicationStatusTag
            loading={statusMutation.isPending}
            onChange={changeStatus}
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
