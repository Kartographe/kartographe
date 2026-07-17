// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { DownOutlined, InfoCircleOutlined } from "@ant-design/icons";
import type { MessageDescriptor } from "@lingui/core";
import { useLingui } from "@lingui/react/macro";
import { Dropdown, Popover, Tag } from "antd";

interface EnumTagProps<T extends string> {
  value: T;
  labels: Record<T, MessageDescriptor>;
  colors: Record<T, string>;
  descriptions?: Record<T, MessageDescriptor>;
  /**
   * When provided, the tag becomes a click-to-open dropdown that lets the user
   * switch the value. Options default to every key of `labels` (in declaration
   * order); the current value is shown selected and disabled. Pass `options` to
   * restrict/reorder the choices.
   */
  onChange?: (value: T) => void;
  options?: readonly T[];
  loading?: boolean;
  disabled?: boolean;
}

/**
 * Enum badge: label + color, with the enum's description behind an (i) popover
 * whenever one is available. When `onChange` is set it doubles as an inline
 * status picker (dropdown).
 */
export function EnumTag<T extends string>({
  value,
  labels,
  colors,
  descriptions,
  onChange,
  options,
  loading = false,
  disabled = false,
}: EnumTagProps<T>) {
  const { t } = useLingui();
  const interactive = Boolean(onChange);

  const tag = (
    <Tag
      color={colors[value]}
      style={{
        marginInlineEnd: 0,
        ...(interactive ? { cursor: "pointer" } : {}),
      }}
    >
      {t(labels[value])}
      {descriptions ? (
        <Popover content={t(descriptions[value])} trigger="click">
          <InfoCircleOutlined
            onClick={(event) => event.stopPropagation()}
            style={{ cursor: "pointer", marginInlineStart: 6, opacity: 0.65 }}
          />
        </Popover>
      ) : null}
      {interactive ? (
        <DownOutlined
          style={{ marginInlineStart: 6, fontSize: 10, opacity: 0.65 }}
        />
      ) : null}
    </Tag>
  );

  if (!(interactive && onChange)) {
    return tag;
  }

  const values = options ?? (Object.keys(labels) as T[]);

  return (
    <Dropdown
      disabled={disabled || loading}
      menu={{
        items: values.map((option) => ({
          key: option,
          label: t(labels[option]),
          disabled: option === value,
        })),
        onClick: ({ key }) => onChange(key as T),
        selectable: true,
        selectedKeys: [value],
      }}
      trigger={["click"]}
    >
      {/* A real <button> for keyboard access; stopPropagation so opening the
          picker never triggers an enclosing click target (a Collapse panel
          header, a clickable table row, …). */}
      <button
        onClick={(event) => event.stopPropagation()}
        style={{
          background: "none",
          border: "none",
          cursor: loading ? "wait" : "pointer",
          lineHeight: 1,
          padding: 0,
        }}
        type="button"
      >
        {tag}
      </button>
    </Dropdown>
  );
}
