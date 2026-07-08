import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/administration/"
)({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/accounts/$accountId/administration/information",
      params,
    });
  },
});
