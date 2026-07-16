// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { SearchOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { Empty, Input, Modal } from "antd";

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Global search modal. Currently inactive — the input is disabled and the
 * results area is a placeholder. Wired to the sidebar search trigger and ⌘K.
 */
export function SearchModal({ open, onClose }: SearchModalProps) {
  const { t } = useLingui();
  return (
    <Modal
      closable={false}
      destroyOnHidden
      footer={null}
      onCancel={onClose}
      open={open}
      styles={{ body: { paddingTop: 8 } }}
      title={null}
    >
      <Input
        disabled
        placeholder={t`Rechercher…`}
        prefix={<SearchOutlined />}
        size="large"
      />
      <Empty
        description={t`La recherche sera bientôt disponible`}
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        style={{ padding: "24px 0" }}
      />
    </Modal>
  );
}
