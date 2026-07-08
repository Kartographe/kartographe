import { Flex } from "antd";
import { MCPConfigSnippets } from "@/features/mcp/mcp-config-snippets";
import { MCPGrantsList } from "@/features/mcp/mcp-grants-list";

export function MCPScreen() {
  return (
    <Flex gap={24} vertical>
      <MCPConfigSnippets />
      <MCPGrantsList />
    </Flex>
  );
}
