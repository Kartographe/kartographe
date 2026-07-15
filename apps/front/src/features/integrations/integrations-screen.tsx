import { Flex } from "antd";
import { IntegrationGrantsList } from "@/features/integrations/integration-grants-list";
import { MCPConfigSnippets } from "@/features/integrations/mcp-config-snippets";

export function IntegrationsScreen() {
  return (
    <Flex gap={24} vertical>
      <MCPConfigSnippets />
      <IntegrationGrantsList />
    </Flex>
  );
}
