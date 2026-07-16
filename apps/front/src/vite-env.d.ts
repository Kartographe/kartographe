// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

/// <reference types="vite/client" />

// Lingui `.po` catalogs are compiled to a messages object by @lingui/vite-plugin.
declare module "*.po" {
  import type { Messages } from "@lingui/core";

  export const messages: Messages;
}
