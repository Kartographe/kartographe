// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { defineConfig } from "@lingui/cli";

export default defineConfig({
  sourceLocale: "fr",
  locales: ["fr"],
  catalogs: [
    {
      path: "<rootDir>/src/lib/lingui/locales/{locale}/messages",
      include: ["src"],
    },
  ],
});
