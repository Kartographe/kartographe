// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { GlobalOutlined, LoadingOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import { Flex, Tag, Typography } from "antd";
import type { components } from "@/api/generated/schema";
import { resolveEntityLink } from "@/features/search/entity-link";
import {
  SEARCH_ENTITY_TYPE_COLORS,
  SEARCH_ENTITY_TYPE_ICONS,
  SEARCH_ENTITY_TYPE_LABELS,
} from "@/features/search/search-labels";

type S = components["schemas"];
type LinkMeta = S["LinkMeta"];
type EntityRef = S["EntityRef"];

/**
 * The entity an internal URL points at: what it is, what contains it, and a way
 * to get there. Rendered as a link when `accountId` matches the current
 * workspace — a reference may point into another account the reader is a member
 * of, and the router's params only address the one they are in.
 */
export function InternalEntity({
  accountId,
  entity,
  navigable = true,
}: {
  accountId: string;
  entity: EntityRef;
  navigable?: boolean;
}) {
  const { t } = useLingui();
  const target = resolveEntityLink(accountId, entity);
  const breadcrumb = entity.parents.map((parent) => parent.label).join(" › ");

  const body = (
    <Flex align="center" gap={8} wrap>
      <Tag
        color={SEARCH_ENTITY_TYPE_COLORS[entity.type]}
        icon={SEARCH_ENTITY_TYPE_ICONS[entity.type]}
        style={{ marginInlineEnd: 0 }}
      >
        {t(SEARCH_ENTITY_TYPE_LABELS[entity.type])}
      </Tag>
      <Typography.Text strong>{entity.label}</Typography.Text>
      {breadcrumb ? (
        <Typography.Text type="secondary">{breadcrumb}</Typography.Text>
      ) : null}
    </Flex>
  );

  if (!navigable) {
    return body;
  }
  return (
    <Link params={target.params} to={target.to}>
      {body}
    </Link>
  );
}

/**
 * What the server could tell about the URL being typed, under the URL field.
 *
 * Three states worth showing and no more: we are asking, the URL is one of ours
 * (show the entity, which is the whole point of resolving it), or it is
 * external (show its host, so a typo in the domain is visible before saving).
 */
export function LinkPreview({
  accountId,
  isLoading,
  meta,
  url,
}: {
  accountId: string;
  isLoading: boolean;
  meta?: LinkMeta;
  url: string;
}) {
  const { t } = useLingui();

  if (isLoading) {
    return (
      <Typography.Text type="secondary">
        <LoadingOutlined /> {t`Lecture de la page…`}
      </Typography.Text>
    );
  }
  if (!(meta && url.trim())) {
    return null;
  }

  return (
    <div
      style={{
        background: "var(--ant-color-fill-quaternary)",
        borderRadius: 8,
        marginBottom: 16,
        padding: 12,
      }}
    >
      {meta.internal ? (
        <InternalEntity
          accountId={accountId}
          entity={meta.internal.entity}
          navigable={meta.internal.accountId === accountId}
        />
      ) : (
        <Typography.Text type="secondary">
          <GlobalOutlined /> {meta.host ?? t`Lien externe`}
        </Typography.Text>
      )}
    </div>
  );
}
