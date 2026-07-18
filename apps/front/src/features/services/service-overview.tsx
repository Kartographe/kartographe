// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { EditOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Flex, Typography } from "antd";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import {
  OverviewField,
  OverviewFields,
} from "@/components/overview/overview-fields";
import { OverviewHeader } from "@/components/overview/overview-header";
import { ServiceFormModal } from "@/features/services/service-form-modal";
import {
  ServiceStatusTag,
  ServiceTypeTag,
} from "@/features/services/service-tags";
import { RichTextView } from "@/lib/rich-text/rich-text-view";

type Service = components["schemas"]["ServiceItem"];

function ExternalLink({ url }: { url: string }) {
  return (
    <Typography.Link href={url} rel="noreferrer" target="_blank">
      {url}
    </Typography.Link>
  );
}

export function ServiceOverview({
  accountId,
  service,
}: {
  accountId: string;
  service: Service;
}) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const statusMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/services/{service_id}",
    { meta: { successMessage: t`Statut mis à jour` } }
  );
  const typeMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/services/{service_id}",
    { meta: { successMessage: t`Type mis à jour` } }
  );

  async function changeStatus(status: Service["status"]) {
    await statusMutation.mutateAsync({
      params: { path: { account_id: accountId, service_id: service.id } },
      body: { status },
    });
    queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}/services/{service_id}"],
    });
    queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}/services"],
    });
  }

  async function changeType(type: Service["type"]) {
    await typeMutation.mutateAsync({
      params: { path: { account_id: accountId, service_id: service.id } },
      body: { type },
    });
    queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}/services/{service_id}"],
    });
    queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}/services"],
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
        date={service.date}
        owner={service.owner}
        statusDate={service.statusDate}
        title={t`Informations`}
      />

      <OverviewFields>
        <OverviewField label={t`Titre`}>{service.title}</OverviewField>
        <OverviewField label={t`Type`}>
          <ServiceTypeTag
            loading={typeMutation.isPending}
            onChange={changeType}
            type={service.type}
          />
        </OverviewField>
        <OverviewField label={t`Statut`}>
          <ServiceStatusTag
            loading={statusMutation.isPending}
            onChange={changeStatus}
            status={service.status}
          />
        </OverviewField>
        <OverviewField label={t`URL`}>
          {service.url ? <ExternalLink url={service.url} /> : "—"}
        </OverviewField>
        <OverviewField label={t`URL OpenAPI`}>
          {service.openapiUrl ? <ExternalLink url={service.openapiUrl} /> : "—"}
        </OverviewField>
        <OverviewField full label={t`Description`}>
          <RichTextView value={service.description} />
        </OverviewField>
      </OverviewFields>

      <ServiceFormModal
        accountId={accountId}
        onClose={() => setEditOpen(false)}
        open={editOpen}
        service={service}
      />
    </Flex>
  );
}
