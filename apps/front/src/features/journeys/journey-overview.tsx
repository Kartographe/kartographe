// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { EditOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Flex, Tag } from "antd";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import {
  OverviewField,
  OverviewFields,
} from "@/components/overview/overview-fields";
import { OverviewHeader } from "@/components/overview/overview-header";
import { JourneyFormModal } from "@/features/journeys/journey-form-modal";
import {
  JourneyStatusTag,
  JourneyTypeTag,
} from "@/features/journeys/journey-tags";
import { usePersonas } from "@/features/journeys/use-personas";
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
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const personas = usePersonas(accountId);

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

  async function changeStatus(status: Journey["status"]) {
    await statusMutation.mutateAsync({
      params: { path: { account_id: accountId, journey_id: journey.id } },
      body: { status },
    });
    queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}/journeys/{journey_id}"],
    });
    queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}/journeys"],
    });
  }

  async function changeType(type: Journey["type"]) {
    await typeMutation.mutateAsync({
      params: { path: { account_id: accountId, journey_id: journey.id } },
      body: { type },
    });
    queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}/journeys/{journey_id}"],
    });
    queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}/journeys"],
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
            onChange={changeType}
            type={journey.type}
          />
        </OverviewField>
        <OverviewField label={t`Statut`}>
          <JourneyStatusTag
            loading={statusMutation.isPending}
            onChange={changeStatus}
            status={journey.status}
          />
        </OverviewField>
        <OverviewField full label={t`Personas`}>
          {journey.personasIds.length ? (
            <Flex gap={4} wrap>
              {journey.personasIds.map((id) => (
                <Tag key={id} style={{ marginInlineEnd: 0 }}>
                  {personas.title(id) ?? t`Persona inconnu`}
                </Tag>
              ))}
            </Flex>
          ) : (
            "—"
          )}
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
