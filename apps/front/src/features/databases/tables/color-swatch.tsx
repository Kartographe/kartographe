// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * The colour a table or a column was given, as a small square.
 *
 * When no colour is set it still takes its slot, invisibly: names stay aligned
 * down a list whether or not their row is coloured. Purely decorative, so it is
 * hidden from assistive tech — the colour carries no information the label does
 * not already give.
 */
export function ColorSwatch({
  color,
  size = 12,
}: {
  color?: string | null;
  size?: number;
}) {
  return (
    <span
      aria-hidden="true"
      style={{
        background: color ?? "transparent",
        border: color ? "1px solid var(--ant-color-border-secondary)" : "none",
        borderRadius: 3,
        display: "inline-block",
        flex: "0 0 auto",
        height: size,
        width: size,
      }}
    />
  );
}
