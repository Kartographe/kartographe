// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Locale-aware number formatting, mirroring `file-size.ts` (locale passed in
 * from `useLingui().i18n.locale`) so callers never reach for `Intl` inline.
 */

/** A plain integer, grouped for the locale (e.g. `1 234`). */
export function formatInteger(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value);
}

/**
 * A ratio as a signed percentage (`0.33` → `+33 %`, `-0.1` → `−10 %`), rounded
 * to a whole percent. The explicit sign reads as a delta, not an absolute.
 */
export function formatSignedPercent(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 0,
    signDisplay: "exceptZero",
  }).format(value);
}
