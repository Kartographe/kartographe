import { useLingui } from "@lingui/react/macro";
import { Flex, Typography } from "antd";
import { Logo } from "@/components/logo";

export function TermsScreen() {
  const { t } = useLingui();
  return (
    <Flex
      style={{
        background: "var(--ant-color-bg-layout)",
        minHeight: "100dvh",
        padding: 24,
      }}
      vertical
    >
      <div style={{ margin: "0 auto", maxWidth: 760, width: "100%" }}>
        <Flex align="center" gap={12} style={{ marginBottom: 24 }}>
          <Logo size={36} />
          <Typography.Title level={4} style={{ margin: 0 }}>
            Kartographe
          </Typography.Title>
        </Flex>
        <Typography.Title level={2}>
          {t`Conditions d'utilisation`}
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          {t`Le contenu de cette page sera publié prochainement.`}
        </Typography.Paragraph>
      </div>
    </Flex>
  );
}
