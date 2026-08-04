// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import {
  ExportOutlined,
  GlobalOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import {
  App,
  Badge,
  Button,
  Empty,
  Flex,
  List,
  Skeleton,
  Tag,
  Typography,
} from "antd";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { ownerName } from "@/features/accounts/owner-cell";
import { CommentDate } from "@/features/comments/comment-date";
import { LINK_TYPE_COLORS, LINK_TYPE_LABELS } from "@/features/links/labels";
import { LinkFormModal } from "@/features/links/link-form-modal";
import { InternalEntity } from "@/features/links/link-preview";
import { RichTextView } from "@/lib/rich-text/rich-text-view";

type S = components["schemas"];
type EntityType = S["EntityType"];
type LinkListItem = S["LinkListItem"];

const LIST_KEY = ["get", "/v1/accounts/{account_id}/links"];

interface LinksPanelProps {
  accountId: string;
  entityType: EntityType;
  entityId: string;
}

/**
 * The references attached to one entity, plus the form to add one.
 *
 * Reads the mutualized `/links` listing filtered to this entity and writes
 * through the mutualized endpoints — one GET and one POST whatever the entity
 * type, exactly like the complexity panel. A reference whose URL points back
 * into Kartographe is rendered as the entity it names rather than as an
 * address, which is what makes cross-referencing worth doing.
 */
export function LinksPanel({
  accountId,
  entityType,
  entityId,
}: LinksPanelProps) {
  const { t } = useLingui();
  const { modal } = App.useApp();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<LinkListItem | undefined>();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const linksQuery = $api.useQuery("get", "/v1/accounts/{account_id}/links", {
    params: {
      path: { account_id: accountId },
      query: { entityType: [entityType], entityId: [entityId] },
    },
  });
  const deleteMutation = $api.useMutation(
    "delete",
    "/v1/accounts/{account_id}/links/{link_id}",
    { meta: { successMessage: t`Référence supprimée` } }
  );

  const links = linksQuery.data?.items ?? [];

  function openCreate() {
    setEditing(undefined);
    setIsFormOpen(true);
  }

  function openEdit(link: LinkListItem) {
    setEditing(link);
    setIsFormOpen(true);
  }

  function confirmDelete(link: LinkListItem) {
    modal.confirm({
      title: t`Supprimer cette référence ?`,
      content: t`Cette action est irréversible.`,
      okText: t`Supprimer`,
      okButtonProps: { danger: true },
      cancelText: t`Annuler`,
      onOk: async () => {
        await deleteMutation.mutateAsync({
          params: { path: { account_id: accountId, link_id: link.id } },
        });
        queryClient.invalidateQueries({ queryKey: LIST_KEY });
      },
    });
  }

  function renderTarget(link: LinkListItem) {
    if (link.meta.internal) {
      return (
        <InternalEntity
          accountId={accountId}
          entity={link.meta.internal.entity}
          navigable={link.meta.internal.accountId === accountId}
        />
      );
    }
    return (
      <Typography.Link
        ellipsis
        href={link.url}
        rel="noreferrer noopener"
        target="_blank"
      >
        <GlobalOutlined /> {link.meta.host ?? link.url} <ExportOutlined />
      </Typography.Link>
    );
  }

  function renderLinks() {
    if (linksQuery.isLoading) {
      return <Skeleton active paragraph={{ rows: 3 }} title={false} />;
    }
    if (links.length === 0) {
      return (
        <Empty
          description={t`Aucune référence pour le moment.`}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }
    return (
      <List
        dataSource={links}
        renderItem={(link) => (
          <List.Item
            actions={[
              <Button key="edit" onClick={() => openEdit(link)} type="link">
                {t`Modifier`}
              </Button>,
              <Button
                danger
                key="delete"
                onClick={() => confirmDelete(link)}
                type="link"
              >
                {t`Supprimer`}
              </Button>,
            ]}
          >
            <Flex gap={6} style={{ flex: 1, minWidth: 0 }} vertical>
              <Flex align="center" gap={8} wrap>
                <Tag
                  color={LINK_TYPE_COLORS[link.type]}
                  style={{ marginInlineEnd: 0 }}
                >
                  {t(LINK_TYPE_LABELS[link.type])}
                </Tag>
                <Typography.Text strong>
                  {/* No title means the URL stands for itself. */}
                  {link.title || link.url}
                </Typography.Text>
              </Flex>
              {renderTarget(link)}
              {link.description ? (
                <RichTextView value={link.description} />
              ) : null}
              <Typography.Text type="secondary">
                {ownerName(link.owner, t`Membre`)} ·{" "}
                <CommentDate date={link.date} />
              </Typography.Text>
            </Flex>
          </List.Item>
        )}
      />
    );
  }

  return (
    <Flex gap={20} vertical>
      <Flex align="center" gap={12} justify="space-between" wrap>
        <Flex align="center" gap={12}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {t`Références`}
          </Typography.Title>
          {links.length > 0 ? (
            <Badge
              color="var(--ant-color-fill-secondary)"
              count={links.length}
              style={{ color: "var(--ant-color-text)" }}
            />
          ) : null}
        </Flex>
        <Button icon={<PlusOutlined />} onClick={openCreate} type="primary">
          {t`Ajouter une référence`}
        </Button>
      </Flex>

      <Typography.Text type="secondary">
        {t`Tickets, documents, maquettes ou autres entités Kartographe rattachés à cet élément.`}
      </Typography.Text>

      {renderLinks()}

      <LinkFormModal
        accountId={accountId}
        entityId={entityId}
        entityType={entityType}
        // Remount on target change so the form starts from the right values.
        key={editing?.id ?? "new"}
        link={editing}
        onClose={() => setIsFormOpen(false)}
        open={isFormOpen}
      />
    </Flex>
  );
}
