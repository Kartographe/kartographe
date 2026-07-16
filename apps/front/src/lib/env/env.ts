// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_APP_NAME: z.string().default("Kartographe"),
    VITE_APP_ENVIRONMENT: z
      .enum(["local", "staging", "production"])
      .default("local"),
    VITE_APP_TAG_VERSION: z.string().default("0.0.0"),
    VITE_APP_COMMIT_HASH: z.string().default("dev"),
    VITE_APP_URL: z.url().default("http://localhost:5173/"),
    VITE_API_URL: z.url(),
    VITE_MCP_URL: z.url().optional(),
    VITE_TURNSTILE_SITE_KEY: z.string().optional(),
    VITE_GOOGLE_CLIENT_ID: z.string().optional(),
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
});
