import { createFileRoute } from "@tanstack/react-router";
import { MCPScreen } from "@/features/mcp/mcp-screen";

export const Route = createFileRoute("/_app/me/mcp")({
  component: MCPScreen,
});
