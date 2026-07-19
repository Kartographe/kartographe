// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { EditOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Flex, Tooltip, Typography } from "antd";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import {
  OverviewField,
  OverviewFields,
} from "@/components/overview/overview-fields";
import { OverviewHeader } from "@/components/overview/overview-header";
import { LockToggleButton } from "@/features/lock/lock-toggle-button";
import { useCanManageLock } from "@/features/lock/use-can-manage-lock";
import { ServiceFormModal } from "@/features/services/service-form-modal";
import { ServicePicture } from "@/features/services/service-picture";
import {
  ServiceCategoryTag,
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
  const categoryMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/services/{service_id}",
    { meta: { successMessage: t`Catégorie mise à jour` } }
  );
  const lockMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/services/{service_id}/lock",
    { meta: { successMessage: t`Service verrouillé` } }
  );
  const unlockMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/services/{service_id}/unlock",
    { meta: { successMessage: t`Service déverrouillé` } }
  );

  const canManageLock = useCanManageLock(accountId);
  const lockPending = lockMutation.isPending || unlockMutation.isPending;

  async function toggleLock() {
    const mutation = service.locked ? unlockMutation : lockMutation;
    await mutation.mutateAsync({
      params: { path: { account_id: accountId, service_id: service.id } },
    });
    queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}/services/{service_id}"],
    });
    queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}/services"],
    });
  }

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

  async function changeCategory(category: Service["category"]) {
    await categoryMutation.mutateAsync({
      params: { path: { account_id: accountId, service_id: service.id } },
      body: { category },
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
          <Flex gap={8}>
            {canManageLock ? (
              <LockToggleButton
                locked={service.locked}
                onToggle={toggleLock}
                pending={lockPending}
                size="middle"
              />
            ) : null}
            <Tooltip title={service.locked ? t`Service verrouillé` : ""}>
              <Button
                disabled={service.locked}
                icon={<EditOutlined />}
                onClick={() => setEditOpen(true)}
              >
                {t`Modifier`}
              </Button>
            </Tooltip>
          </Flex>
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
            onChange={service.locked ? undefined : changeType}
            type={service.type}
          />
        </OverviewField>
        <OverviewField label={t`Catégorie`}>
          <ServiceCategoryTag
            category={service.category}
            loading={categoryMutation.isPending}
            onChange={service.locked ? undefined : changeCategory}
          />
        </OverviewField>
        <OverviewField label={t`Statut`}>
          <ServiceStatusTag
            loading={statusMutation.isPending}
            onChange={service.locked ? undefined : changeStatus}
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

      <ServicePicture accountId={accountId} service={service} />

      <ServiceFormModal
        accountId={accountId}
        onClose={() => setEditOpen(false)}
        open={editOpen}
        service={service}
      />
    </Flex>
  );
}
