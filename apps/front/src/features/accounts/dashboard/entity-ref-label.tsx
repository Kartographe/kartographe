// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { Tag, Typography } from "antd";
import type { components } from "@/api/generated/schema";
import { ENTITY_TYPE_LABELS } from "@/features/accounts/dashboard/metrics";

type EntityRef = components["schemas"]["EntityRef"];

/** "Fonctionnalité · Connexion" — the type of the target entity and its label,
 * or a neutral note when the target has since been deleted. */
export function EntityRefLabel({
  entity,
  entityType,
}: {
  entity: EntityRef | null | undefined;
  entityType: components["schemas"]["EntityType"];
}) {
  const { t } = useLingui();
  const typeLabel = t(ENTITY_TYPE_LABELS[entity?.type ?? entityType]);

  if (!entity) {
    return (
      <Typography.Text italic style={{ fontSize: 12 }} type="secondary">
        {t`${typeLabel} supprimé·e`}
      </Typography.Text>
    );
  }

  return (
    <Typography.Text ellipsis style={{ fontSize: 12 }} type="secondary">
      <Tag style={{ marginInlineEnd: 6 }}>{typeLabel}</Tag>
      {entity.label}
    </Typography.Text>
  );
}
