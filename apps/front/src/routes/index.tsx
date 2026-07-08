import { useLingui } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { Flex, Typography } from "antd";
import { env } from "@/lib/env/env";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { t } = useLingui();
  return (
    <Flex
      align="center"
      justify="center"
      style={{ minHeight: "100dvh", padding: 24 }}
      vertical
    >
      <Typography.Title>{t`Bonjour 👋`}</Typography.Title>
      <Typography.Paragraph type="secondary">
        {env.VITE_APP_NAME} — {env.VITE_APP_ENVIRONMENT}
      </Typography.Paragraph>
    </Flex>
  );
}
