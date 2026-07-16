// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

interface LogoProps {
  size?: number;
}

/**
 * The Kartographe brand mark — the self-contained badge (`/favicon.svg`): a
 * rounded tile with the "K" cartography monogram, so it reads on light, dark
 * and coloured backgrounds alike.
 */
export function Logo({ size = 32 }: LogoProps) {
  return (
    <img
      alt="Kartographe"
      height={size}
      src="/favicon.svg"
      style={{ display: "block" }}
      width={size}
    />
  );
}
