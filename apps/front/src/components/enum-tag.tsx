// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { InfoCircleOutlined } from "@ant-design/icons";
import type { MessageDescriptor } from "@lingui/core";
import { useLingui } from "@lingui/react/macro";
import { Popover, Tag } from "antd";

interface EnumTagProps<T extends string> {
  value: T;
  labels: Record<T, MessageDescriptor>;
  colors: Record<T, string>;
  descriptions?: Record<T, MessageDescriptor>;
}

/**
 * Enum badge: label + color, with the enum's description behind an (i) popover
 * whenever one is available.
 */
export function EnumTag<T extends string>({
  value,
  labels,
  colors,
  descriptions,
}: EnumTagProps<T>) {
  const { t } = useLingui();
  return (
    <Tag color={colors[value]} style={{ marginInlineEnd: 0 }}>
      {t(labels[value])}
      {descriptions ? (
        <Popover content={t(descriptions[value])} trigger="click">
          <InfoCircleOutlined
            onClick={(event) => event.stopPropagation()}
            style={{ cursor: "pointer", marginInlineStart: 6, opacity: 0.65 }}
          />
        </Popover>
      ) : null}
    </Tag>
  );
}
