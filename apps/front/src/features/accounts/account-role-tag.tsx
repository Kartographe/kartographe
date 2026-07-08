import { InfoCircleOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { Popover, Tag } from "antd";
import type { components } from "@/api/generated/schema";
import {
  ROLE_COLORS,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
} from "@/features/accounts/labels";

type Role = components["schemas"]["AccountUserRole"];

export function AccountRoleTag({ role }: { role: Role }) {
  const { t } = useLingui();
  return (
    <Tag color={ROLE_COLORS[role]} style={{ marginInlineEnd: 0 }}>
      {t(ROLE_LABELS[role])}
      <Popover content={t(ROLE_DESCRIPTIONS[role])} trigger="click">
        <InfoCircleOutlined
          onClick={(event) => event.stopPropagation()}
          style={{ cursor: "pointer", marginInlineStart: 6, opacity: 0.65 }}
        />
      </Popover>
    </Tag>
  );
}
