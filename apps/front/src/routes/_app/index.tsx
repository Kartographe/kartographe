import { createFileRoute, redirect } from "@tanstack/react-router";
import { DashboardScreen } from "@/features/account/screens/dashboard-screen";
import { resolveDefaultAccount } from "@/features/accounts/resolve-default-account";

export const Route = createFileRoute("/_app/")({
  // `/` is the no-account landing, nothing more: as soon as the user belongs to
  // an account we open it (the remembered one, else the first) rather than
  // showing a dashboard they'd have to click through.
  beforeLoad: async ({ context }) => {
    const accountId = await resolveDefaultAccount(context.queryClient);
    if (accountId) {
      // `replace` so the back button leaves the app instead of bouncing off `/`.
      throw redirect({
        to: "/accounts/$accountId",
        params: { accountId },
        replace: true,
      });
    }
  },
  component: DashboardScreen,
});
