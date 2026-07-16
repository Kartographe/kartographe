// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { createFileRoute } from "@tanstack/react-router";
import { AccountsList } from "@/features/accounts/accounts-list";

export const Route = createFileRoute("/_app/me/accounts/")({
  component: AccountsList,
});
