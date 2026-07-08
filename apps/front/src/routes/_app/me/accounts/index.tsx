import { createFileRoute } from "@tanstack/react-router";
import { AccountsList } from "@/features/accounts/accounts-list";

export const Route = createFileRoute("/_app/me/accounts/")({
  component: AccountsList,
});
