// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * A dependency-free SVG sparkline: one thin line over a faint area fill, no
 * axes or labels. It shows the *shape* of creation velocity across the period;
 * the headline number and delta carry the magnitude. Colour comes from the
 * theme's primary token so it tracks light/dark.
 */

const VIEW_W = 120;
const PAD = 3;
const STROKE = 2;
const AREA_OPACITY = 0.12;

export function Sparkline({
  data,
  height = 40,
  label,
}: {
  data: number[];
  height?: number;
  label?: string;
}) {
  const usableH = height - PAD * 2;
  const max = Math.max(1, ...data);
  const lastIndex = data.length - 1;

  const points = data.map((value, index) => {
    const x = lastIndex > 0 ? (index / lastIndex) * VIEW_W : VIEW_W / 2;
    const y = PAD + usableH * (1 - value / max);
    return [x, y] as const;
  });

  const line = points.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `M0,${height} ${points
    .map(([x, y]) => `L${x},${y}`)
    .join(" ")} L${VIEW_W},${height} Z`;

  return (
    <svg
      aria-label={label}
      height={height}
      preserveAspectRatio="none"
      role="img"
      viewBox={`0 0 ${VIEW_W} ${height}`}
      width="100%"
    >
      <path d={area} fill="var(--ant-color-primary)" opacity={AREA_OPACITY} />
      <polyline
        fill="none"
        points={line}
        stroke="var(--ant-color-primary)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={STROKE}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
