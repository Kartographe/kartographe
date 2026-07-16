// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { EditOutlined, InboxOutlined, RocketOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Descriptions, Flex, Space, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { useAccountUserMap } from "@/features/accounts/use-account-user-map";
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
  const users = useAccountUserMap(accountId);
  const personas = usePersonas(accountId);

  const activateMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/journeys/{journey_id}/activate",
    { meta: { successMessage: t`Parcours activé` } }
  );
  const archiveMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/journeys/{journey_id}/archive",
    { meta: { successMessage: t`Parcours archivé` } }
  );

  // Only an active entity can be archived; a draft or archived one is activated.
  const isActive = journey.status === "active";

  async function toggleStatus() {
    const params = { path: { account_id: accountId, journey_id: journey.id } };
    if (isActive) {
      await archiveMutation.mutateAsync({ params });
    } else {
      await activateMutation.mutateAsync({ params });
    }
    queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}/journeys/{journey_id}"],
    });
    queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}/journeys"],
    });
  }

  return (
    <Flex gap={16} vertical>
      <Flex align="center" justify="space-between">
        <Typography.Title level={4} style={{ margin: 0 }}>
          {t`Informations`}
        </Typography.Title>
        <Space>
          <Button icon={<EditOutlined />} onClick={() => setEditOpen(true)}>
            {t`Modifier`}
          </Button>
          <Button
            icon={isActive ? <InboxOutlined /> : <RocketOutlined />}
            loading={activateMutation.isPending || archiveMutation.isPending}
            onClick={toggleStatus}
          >
            {isActive ? t`Archiver` : t`Activer`}
          </Button>
        </Space>
      </Flex>

      <Descriptions bordered column={1} size="small">
        <Descriptions.Item label={t`Titre`}>{journey.title}</Descriptions.Item>
        <Descriptions.Item label={t`Type`}>
          <JourneyTypeTag type={journey.type} />
        </Descriptions.Item>
        <Descriptions.Item label={t`Statut`}>
          <JourneyStatusTag status={journey.status} />
        </Descriptions.Item>
        <Descriptions.Item label={t`Personas`}>
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
        </Descriptions.Item>
        <Descriptions.Item label={t`Description`}>
          <RichTextView value={journey.description} />
        </Descriptions.Item>
        <Descriptions.Item label={t`Propriétaire`}>
          {users.name(journey.ownerId)}
        </Descriptions.Item>
        <Descriptions.Item label={t`Créé le`}>
          {dayjs(journey.date).format("DD/MM/YYYY HH:mm")}
        </Descriptions.Item>
        <Descriptions.Item label={t`Statut modifié le`}>
          {dayjs(journey.statusDate).format("DD/MM/YYYY HH:mm")}
        </Descriptions.Item>
      </Descriptions>

      <JourneyFormModal
        accountId={accountId}
        journey={journey}
        onClose={() => setEditOpen(false)}
        open={editOpen}
      />
    </Flex>
  );
}
