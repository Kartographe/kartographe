// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { i18n } from "@lingui/core";

/**
 * Kartographe ships French only for now, but the pipeline is locale-ready:
 * add a locale to `lingui.config.ts`, run `pnpm lingui:extract`, translate the
 * new catalog, then extend `SUPPORTED_LOCALES`.
 */
export const DEFAULT_LOCALE = "fr";
export const SUPPORTED_LOCALES = ["fr"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export async function activateLocale(locale: AppLocale): Promise<void> {
  const { messages } = await import(`./locales/${locale}/messages.po`);
  i18n.load(locale, messages);
  i18n.activate(locale);
}
