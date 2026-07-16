// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { Avatar } from "antd";

interface AccountAvatarProps {
  name: string;
  pictureProfile?: string | null;
  size?: number;
}

/** Account logo, falling back to the first letter of the account name. */
export function AccountAvatar({
  name,
  pictureProfile,
  size = 24,
}: AccountAvatarProps) {
  return (
    <Avatar
      shape="square"
      size={size}
      src={pictureProfile ?? undefined}
      style={{ backgroundColor: "var(--ant-color-primary)", flexShrink: 0 }}
    >
      {(name?.[0] ?? "?").toUpperCase()}
    </Avatar>
  );
}
