// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { Tag } from "antd";
import type { components } from "@/api/generated/schema";
import {
  ACCOUNT_STATUS_COLORS,
  ACCOUNT_STATUS_LABELS,
  INVITATION_STATUS_COLORS,
  INVITATION_STATUS_LABELS,
} from "@/features/accounts/labels";

type InvitationStatus = components["schemas"]["AccountUserInvitationStatus"];
type AccountStatus = components["schemas"]["AccountStatus"];

export function InvitationStatusTag({ status }: { status: InvitationStatus }) {
  const { t } = useLingui();
  return (
    <Tag color={INVITATION_STATUS_COLORS[status]}>
      {t(INVITATION_STATUS_LABELS[status])}
    </Tag>
  );
}

export function AccountStatusTag({ status }: { status: AccountStatus }) {
  const { t } = useLingui();
  return (
    <Tag color={ACCOUNT_STATUS_COLORS[status]}>
      {t(ACCOUNT_STATUS_LABELS[status])}
    </Tag>
  );
}
