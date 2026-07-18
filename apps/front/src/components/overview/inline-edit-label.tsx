// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { EditOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { Button, Flex } from "antd";
import { OverviewFieldLabel } from "@/components/overview/overview-fields";

/**
 * An overview field label with an edit pencil to its *left*. The pencil is
 * hidden while editing or when the field can't be edited (locked). Shared by the
 * inline text/rich-text editors.
 */
export function InlineEditLabel({
  label,
  editing,
  disabled,
  onEdit,
}: {
  label: string;
  editing: boolean;
  disabled?: boolean;
  onEdit: () => void;
}) {
  const { t } = useLingui();
  return (
    <Flex align="center" gap={4} style={{ minHeight: 22 }}>
      {disabled || editing ? null : (
        <Button
          aria-label={t`Modifier ${label}`}
          icon={<EditOutlined />}
          onClick={onEdit}
          size="small"
          style={{ height: 20, width: 20 }}
          type="text"
        />
      )}
      <OverviewFieldLabel>{label}</OverviewFieldLabel>
    </Flex>
  );
}
