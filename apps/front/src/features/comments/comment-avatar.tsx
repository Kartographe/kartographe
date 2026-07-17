// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { UserOutlined } from "@ant-design/icons";
import { Avatar } from "antd";

/** Any user-ish shape with a name + avatar: an owner, a member ref, or `me`. */
interface Person {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  pictureProfile?: string | null;
}

function initials(user: Person): string {
  const letters = [user.firstName, user.lastName]
    .filter(Boolean)
    .map((part) => part?.[0]);
  if (letters.length) {
    return letters.join("").toUpperCase();
  }
  return (user.email?.[0] ?? "?").toUpperCase();
}

/** Comment author avatar, falling back to initials then to a generic icon. */
export function CommentAvatar({
  user,
  size = 36,
}: {
  user: Person | undefined;
  size?: number;
}) {
  if (!user) {
    return <Avatar icon={<UserOutlined />} size={size} />;
  }
  return (
    <Avatar
      size={size}
      src={user.pictureProfile ?? undefined}
      style={{ backgroundColor: "var(--ant-color-primary)", flexShrink: 0 }}
    >
      {initials(user)}
    </Avatar>
  );
}
