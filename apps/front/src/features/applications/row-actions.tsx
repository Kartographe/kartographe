// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import {
  DeleteOutlined,
  EditOutlined,
  InboxOutlined,
  RocketOutlined,
} from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { Button, Space, Tooltip } from "antd";

interface RowActionsProps {
  /** Only an *active* row can be archived; a draft or archived one is activated. */
  active: boolean;
  onEdit: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}

/** Edit / activate-archive / delete cluster shared by the application tables. */
export function RowActions({
  active,
  onEdit,
  onToggleStatus,
  onDelete,
}: RowActionsProps) {
  const { t } = useLingui();
  return (
    <Space>
      <Tooltip title={t`Modifier`}>
        <Button icon={<EditOutlined />} onClick={onEdit} size="small" />
      </Tooltip>
      <Tooltip title={active ? t`Archiver` : t`Activer`}>
        <Button
          icon={active ? <InboxOutlined /> : <RocketOutlined />}
          onClick={onToggleStatus}
          size="small"
        />
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
