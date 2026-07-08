import { useLingui } from "@lingui/react/macro";
import { useNavigate } from "@tanstack/react-router";
import { Button, Flex, Input, Typography } from "antd";
import { useState } from "react";

const NON_ALNUM = /[^A-Z0-9]/g;

export function normalizeUserCode(raw: string): string {
  const cleaned = raw.toUpperCase().replace(NON_ALNUM, "");
  if (cleaned.length <= 4) {
    return cleaned;
  }
  return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}`;
}

export function UserCodeForm() {
  const { t } = useLingui();
  const navigate = useNavigate();
  const [code, setCode] = useState("");

  const normalized = normalizeUserCode(code);
  const ready = normalized.replace("-", "").length === 8;

  return (
    <Flex gap={16} vertical>
      <div>
        <Typography.Title level={4} style={{ marginBottom: 4 }}>
          {t`Connecter une application`}
        </Typography.Title>
        <Typography.Text type="secondary">
          {t`Saisissez le code affiché par l'application.`}
        </Typography.Text>
      </div>
      <Input
        onChange={(event) => setCode(normalizeUserCode(event.target.value))}
        placeholder="XXXX-XXXX"
        size="large"
        style={{ letterSpacing: 2, textAlign: "center" }}
        value={code}
      />
      <Button
        block
        disabled={!ready}
        onClick={() =>
          navigate({
            to: "/connect-application",
            search: { userCode: normalized },
          })
        }
        type="primary"
      >
        {t`Continuer`}
      </Button>
    </Flex>
  );
}
