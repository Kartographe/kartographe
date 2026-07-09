import {
  DeleteOutlined,
  EditOutlined,
  InboxOutlined,
  RocketOutlined,
} from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { Button, Space, Tooltip } from "antd";

interface RowActionsProps {
  archived: boolean;
  onEdit: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}

/** Edit / activate-archive / delete cluster shared by the application tables. */
export function RowActions({
  archived,
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
      <Tooltip title={archived ? t`Activer` : t`Archiver`}>
        <Button
          icon={archived ? <RocketOutlined /> : <InboxOutlined />}
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
