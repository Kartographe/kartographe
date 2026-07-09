import { UserOutlined } from "@ant-design/icons";
import { Avatar } from "antd";
import type { components } from "@/api/generated/schema";

type UserRef = components["schemas"]["AccountUserUserRefItem"];

function initials(user: UserRef): string {
  const letters = [user.firstName, user.lastName]
    .filter(Boolean)
    .map((part) => part?.[0]);
  if (letters.length) {
    return letters.join("").toUpperCase();
  }
  return (user.email[0] ?? "?").toUpperCase();
}

/** Comment author avatar, falling back to initials then to a generic icon. */
export function CommentAvatar({
  user,
  size = 36,
}: {
  user: UserRef | undefined;
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
