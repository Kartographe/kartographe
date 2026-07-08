import { createFileRoute } from "@tanstack/react-router";
import { MCPGrantsList } from "@/features/mcp/mcp-grants-list";

export const Route = createFileRoute("/_app/me/mcp")({
  component: MCPGrantsList,
});
