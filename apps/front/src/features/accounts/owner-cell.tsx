// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { Avatar, Flex, Typography } from "antd";
import type { components } from "@/api/generated/schema";

type Owner = components["schemas"]["OwnerItem"];

/** Display name for an owner: "First Last", else a neutral fallback (no email). */
export function ownerName(owner: Owner, fallback: string): string {
  return (
    [owner.firstName, owner.lastName].filter(Boolean).join(" ") || fallback
  );
}

/**
 * Avatar + name for an entity's denormalised `owner`, sourced straight from the
 * entity payload — no `/accounts/{id}/users` round-trip.
 */
export function OwnerCell({
  owner,
  size = 24,
}: {
  owner: Owner;
  size?: number;
}) {
  const { t } = useLingui();
  const name = ownerName(owner, t`Utilisateur`);
  return (
    <Flex align="center" gap={8}>
      <Avatar size={size} src={owner.pictureProfile ?? undefined}>
        {(name[0] ?? "?").toUpperCase()}
      </Avatar>
      <Typography.Text ellipsis>{name}</Typography.Text>
    </Flex>
  );
}
