import { useLingui } from "@lingui/react/macro";
import { Alert, Card, Flex, Tabs, Typography } from "antd";
import { env } from "@/lib/env/env";

function CodeBlock({ code }: { code: string }) {
  return (
    <Typography.Paragraph copyable={{ text: code }} style={{ marginBottom: 0 }}>
      <pre
        style={{
          background: "var(--ant-color-bg-layout)",
          borderRadius: 8,
          margin: 0,
          overflowX: "auto",
          padding: "12px 16px",
        }}
      >
        <code>{code}</code>
      </pre>
    </Typography.Paragraph>
  );
}

export function MCPConfigSnippets() {
  const { t } = useLingui();
  const mcpUrl = env.VITE_MCP_URL ?? `${env.VITE_API_URL}/mcp`;

  const claudeCli = `claude mcp add --transport http kartographe ${mcpUrl}`;
  const mcpJson = JSON.stringify(
    { mcpServers: { kartographe: { type: "http", url: mcpUrl } } },
    null,
    2
  );

  return (
    <Card
      title={
        <Typography.Text strong>{t`Connecter une application`}</Typography.Text>
      }
    >
      <Flex gap={12} vertical>
        <Alert
          message={t`Ajoutez l'URL ci-dessous à votre client MCP. À la première connexion, votre navigateur s'ouvrira pour vous demander d'autoriser l'accès.`}
          showIcon
          type="info"
        />
        <div>
          <Typography.Text type="secondary">{t`URL du serveur MCP`}</Typography.Text>
          <CodeBlock code={mcpUrl} />
        </div>
        <Tabs
          items={[
            {
              key: "cli",
              label: t`Claude Code`,
              children: (
                <Flex gap={8} vertical>
                  <Typography.Text type="secondary">
                    {t`Exécutez cette commande dans votre terminal :`}
                  </Typography.Text>
                  <CodeBlock code={claudeCli} />
                </Flex>
              ),
            },
            {
              key: "json",
              label: t`Fichier .mcp.json`,
              children: (
                <Flex gap={8} vertical>
                  <Typography.Text type="secondary">
                    {t`Ajoutez cette entrée à votre configuration MCP (Claude Desktop, VS Code…) :`}
                  </Typography.Text>
                  <CodeBlock code={mcpJson} />
                </Flex>
              ),
            },
          ]}
        />
      </Flex>
    </Card>
  );
}
