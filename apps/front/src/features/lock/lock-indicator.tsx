// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { LockOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { Tooltip } from "antd";
import dayjs from "dayjs";
import type { components } from "@/api/generated/schema";
import { ownerName } from "@/features/accounts/owner-cell";

type Owner = components["schemas"]["OwnerItem"];

/**
 * A padlock shown before a locked entity's title, revealing who froze it and
 * when on hover. Renders nothing when the entity is unlocked.
 */
export function LockIndicator({
  locked,
  lockedBy,
  lockedDate,
}: {
  locked: boolean;
  lockedBy?: Owner | null;
  lockedDate?: string | null;
}) {
  const { t } = useLingui();
  if (!locked) {
    return null;
  }
  const name = ownerName(lockedBy ?? ({} as Owner), t`un utilisateur`);
  const when = lockedDate ? dayjs(lockedDate).format("DD/MM/YYYY") : null;
  const title = when
    ? t`Verrouillé par ${name} le ${when}`
    : t`Verrouillé par ${name}`;
  return (
    <Tooltip title={title}>
      <LockOutlined style={{ color: "var(--ant-color-warning)" }} />
    </Tooltip>
  );
}
