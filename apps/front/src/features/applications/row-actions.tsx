// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { Button, Space, Tooltip } from "antd";

interface RowActionsProps {
  onEdit: () => void;
  onDelete: () => void;
}

/** Edit / delete cluster shared by the application tables. */
export function RowActions({ onEdit, onDelete }: RowActionsProps) {
  const { t } = useLingui();
  return (
    <Space>
      <Tooltip title={t`Modifier`}>
        <Button icon={<EditOutlined />} onClick={onEdit} size="small" />
      </Tooltip>
      <Tooltip title={t`Supprimer`}>
        <Button
          danger
          icon={<DeleteOutlined />}
          onClick={onDelete}
          size="small"
        />
      </Tooltip>
    </Space>
  );
}
