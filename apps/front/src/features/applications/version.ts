// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

/** The API carries versions as tuples (`[1, 2, 3]`); the UI shows `1.2.3`. */
export function formatVersion(version: number[]): string {
  return version.join(".");
}

export function parseVersion(value: string): number[] {
  return value
    .split(".")
    .map((part) => Number.parseInt(part, 10))
    .filter((part) => Number.isFinite(part));
}
