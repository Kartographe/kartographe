// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { InfoCircleOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { Popover, Tag } from "antd";
import type { components } from "@/api/generated/schema";
import {
  VOTE_ROLE_COLORS,
  VOTE_ROLE_DESCRIPTIONS,
  VOTE_ROLE_LABELS,
} from "@/features/accounts/labels";

type VoteRole = components["schemas"]["VoteRole"];

export function VoteRoleTag({ voteRole }: { voteRole: VoteRole }) {
  const { t } = useLingui();
  return (
    <Tag color={VOTE_ROLE_COLORS[voteRole]} style={{ marginInlineEnd: 0 }}>
      {t(VOTE_ROLE_LABELS[voteRole])}
      <Popover content={t(VOTE_ROLE_DESCRIPTIONS[voteRole])} trigger="click">
        <InfoCircleOutlined
          onClick={(event) => event.stopPropagation()}
          style={{ cursor: "pointer", marginInlineStart: 6, opacity: 0.65 }}
        />
      </Popover>
    </Tag>
  );
}
