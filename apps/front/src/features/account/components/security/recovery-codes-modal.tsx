import { useLingui } from "@lingui/react/macro";
import { Alert, Modal, Typography } from "antd";

interface RecoveryCodesModalProps {
  open: boolean;
  codes: string[];
  onClose: () => void;
}

export function RecoveryCodesModal({
  open,
  codes,
  onClose,
}: RecoveryCodesModalProps) {
  const { t } = useLingui();
  return (
    <Modal
      okText={t`J'ai noté mes codes`}
      onCancel={onClose}
      onOk={onClose}
      open={open}
      title={t`Codes de récupération`}
    >
      <Alert
        message={t`Conservez ces codes en lieu sûr. Chacun ne fonctionne qu'une seule fois et ils ne seront plus affichés.`}
        showIcon
        style={{ marginBottom: 16 }}
        type="warning"
      />
      <Typography.Paragraph>
        <pre style={{ margin: 0 }}>{codes.join("\n")}</pre>
      </Typography.Paragraph>
    </Modal>
  );
}
