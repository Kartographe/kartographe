// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { Flex, Typography } from "antd";
import dayjs from "dayjs";
import type { ReactNode } from "react";
import type { components } from "@/api/generated/schema";
import { OwnerCell } from "@/features/accounts/owner-cell";

type Owner = components["schemas"]["OwnerItem"];

/**
 * Header for an entity "fiche" (overview): the section title on the left, and a
 * right-aligned meta block that lifts the ownership / lifecycle context out of
 * the field list — who created it, when, and when its status last changed —
 * sitting next to the primary action (e.g. « Modifier »).
 */
export function OverviewHeader({
  title,
  owner,
  date,
  statusDate,
  actions,
}: {
  title: string;
  owner: Owner;
  date: string;
  statusDate?: string | null;
  actions?: ReactNode;
}) {
  const { t } = useLingui();

  const createdLine = t`Créé le ${dayjs(date).format("DD/MM/YYYY HH:mm")}`;
  const statusLine = statusDate
    ? t`Statut modifié le ${dayjs(statusDate).format("DD/MM/YYYY HH:mm")}`
    : null;

  return (
    <Flex align="flex-start" gap={16} justify="space-between" wrap>
      <Typography.Title level={4} style={{ margin: 0 }}>
        {title}
      </Typography.Title>

      <Flex align="center" gap={16} wrap>
        <Flex align="flex-end" gap={2} vertical>
          <Flex align="center" gap={6}>
            <Typography.Text style={{ fontSize: 12 }} type="secondary">
              {t`Créé par`}
            </Typography.Text>
            <OwnerCell owner={owner} size={20} />
          </Flex>
          <Typography.Text
            style={{ fontSize: 12, textAlign: "right" }}
            type="secondary"
          >
            {createdLine}
            {statusLine ? ` · ${statusLine}` : ""}
          </Typography.Text>
        </Flex>
        {actions}
      </Flex>
    </Flex>
  );
}
