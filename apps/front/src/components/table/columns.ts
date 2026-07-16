// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { TableProps } from "antd";

/**
 * Shared column widths, so the same kind of data lines up across every table.
 * Every column needs one: `scrollX` sums them, and `table-layout: fixed` gives
 * width-less columns whatever is left over, which breaks their ellipsis.
 */
export const COL = {
  date: 120,
  datetime: 160,
  status: 140,
  type: 150,
  role: 150,
  tags: 220,
  text: 180,
  title: 240,
  email: 240,
  url: 260,
  description: 280,
} as const;

const ICON_BUTTON = 24;
const LABELLED_BUTTON = 100;
const SPACE_GAP = 8;
const CELL_PADDING = 16;

/**
 * Width of an actions cell: `size="small"` icon buttons are 24px, a labelled one
 * ("Accéder", "Accepter", "Déconnecter") about 100px, laid out by `<Space>` with
 * an 8px gap. Count what the cell actually renders — most clusters are icon-only
 * buttons wrapped in a `<Tooltip>`, which is *not* a label.
 *
 * Size on the maximal case when buttons are conditional: a column width is
 * shared by every row.
 */
export function actionsWidth({
  icons = 0,
  labelled = 0,
}: {
  icons?: number;
  labelled?: number;
}) {
  const count = icons + labelled;
  return (
    icons * ICON_BUTTON +
    labelled * LABELLED_BUTTON +
    Math.max(count - 1, 0) * SPACE_GAP +
    CELL_PADDING
  );
}

/** Width rc-table reserves for the expand toggle of an `expandable` table. */
export const EXPAND_COLUMN_WIDTH = 48;

/**
 * `scroll.x` for a table, summed from its declared column widths.
 *
 * Must be a number: rc-table only picks `table-layout: fixed` — and so only
 * honours `width`/`ellipsis` — when `scroll.x` is numeric. With `"max-content"`
 * alongside a fixed column it falls back to `auto` and every ellipsis silently
 * stops truncating (@rc-component/table `Table.js`, mergedTableLayout).
 */
export function scrollX<T>(
  columns: TableProps<T>["columns"],
  extra = 0
): { x: number } {
  const total = (columns ?? []).reduce((sum, column) => {
    const { width, hidden } = column as {
      width?: number | string;
      hidden?: boolean;
    };
    // rc-table drops hidden columns before layout, so counting them here would
    // reserve dead space on the right.
    if (hidden || typeof width !== "number") {
      return sum;
    }
    return sum + width;
  }, 0);
  return { x: total + extra };
}
