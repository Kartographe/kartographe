// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

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
