import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ForbiddenListener } from "@/features/auth/components/forbidden-listener";
import { SessionExpiredListener } from "@/features/auth/components/session-expired-listener";
import { ThemeProvider } from "@/lib/theme/theme-provider";

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
});

function RootComponent() {
  return (
    <ThemeProvider>
      <SessionExpiredListener />
      <ForbiddenListener />
      <Outlet />
      {import.meta.env.DEV && (
        <TanStackRouterDevtools position="bottom-right" />
      )}
    </ThemeProvider>
  );
}
