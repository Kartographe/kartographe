import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Flex, Form, Modal, Select, Typography } from "antd";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { dtoEnums } from "@/api/generated/schema.enums";
import { ROLE_LABELS } from "@/features/accounts/labels";

type Role = components["schemas"]["AccountUserRole"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface InviteMembersModalProps {
  accountId: string;
  canGrantOwner: boolean;
  open: boolean;
  onClose: () => void;
}

export function InviteMembersModal({
  accountId,
  canGrantOwner,
  open,
  onClose,
}: InviteMembersModalProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const [emails, setEmails] = useState<string[]>([]);
  const [role, setRole] = useState<Role>("developer");
  const [emailError, setEmailError] = useState<string | null>(null);

  const inviteMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/invitations",
    { meta: { successMessage: t`Invitations envoyées` } }
  );

  const roleOptions = dtoEnums.AccountUserRole.filter(
    (value) => canGrantOwner || value !== "owner"
  ).map((value) => ({ value, label: t(ROLE_LABELS[value]) }));

  function reset() {
    setEmails([]);
    setRole("developer");
    setEmailError(null);
  }

  async function submit() {
    const invalid = emails.filter((email) => !EMAIL_RE.test(email));
    if (emails.length === 0) {
      setEmailError(t`Ajoutez au moins un email`);
      return;
    }
    if (invalid.length > 0) {
      setEmailError(t`Adresse email invalide : ${invalid.join(", ")}`);
      return;
    }
    await inviteMutation.mutateAsync({
      params: { path: { account_id: accountId } },
      body: { emails, role },
    });
    queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}/invitations"],
    });
    reset();
    onClose();
  }

  return (
    <Modal
      destroyOnHidden
      footer={null}
      onCancel={() => {
        reset();
        onClose();
      }}
      open={open}
      title={t`Inviter des membres`}
    >
      <Flex gap={12} vertical>
        <Form.Item
          help={emailError ?? undefined}
          label={t`Adresses email`}
          validateStatus={emailError ? "error" : undefined}
        >
          <Select
            mode="tags"
            onChange={(value: string[]) => {
              setEmails(value.map((email) => email.trim().toLowerCase()));
              setEmailError(null);
            }}
            open={false}
            placeholder={t`nom@exemple.com`}
            tokenSeparators={[",", " ", ";"]}
            value={emails}
          />
        </Form.Item>
        <Form.Item label={t`Rôle`}>
          <Select
            onChange={(value: Role) => setRole(value)}
            options={roleOptions}
            value={role}
          />
        </Form.Item>
        <Typography.Text style={{ fontSize: 12 }} type="secondary">
          {t`Chaque invitation est valable une semaine. Les emails déjà en attente sont ignorés.`}
        </Typography.Text>
        <Button
          block
          loading={inviteMutation.isPending}
          onClick={submit}
          type="primary"
        >
          {t`Envoyer les invitations`}
        </Button>
      </Flex>
    </Modal>
  );
}
