// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { ColumnType } from "antd/es/table";
import type { components } from "@/api/generated/schema";
import { ComplexityCell } from "@/features/complexity/complexity-cell";

type Stats = components["schemas"]["ComplexityStatsItem"];
type Mine = components["schemas"]["MyComplexityItem"];

const COMPLEXITY_TITLE = msg`Complexité`;
const ESTIMATED_LABEL = msg`Estimée par moi`;
const NOT_ESTIMATED_LABEL = msg`Pas encore estimée`;

/** The shape a listing row must expose for the complexity column. */
export interface EstimableRow {
  complexity?: Stats | null;
  myComplexity?: Mine | null;
}

type Translate = (descriptor: MessageDescriptor) => string;

/**
 * Ant column filter entries for the caller's own estimate (single-select).
 *
 * Binary, unlike votes: an estimate's number means nothing from one scale to
 * the next, and "I cannot estimate" is already an answer — so the only useful
 * question is whether the caller weighed in.
 */
export function myComplexityFilters(t: Translate) {
  return [
    { text: t(ESTIMATED_LABEL), value: "estimated" },
    { text: t(NOT_ESTIMATED_LABEL), value: "none" },
  ];
}

/**
 * A ready-made "Complexité" table column: the compact `ComplexityCell` plus a
 * single-select header filter on whether the caller estimated. Slot it in next
 * to the votes column.
 *
 * `t` comes from the caller's `useLingui()` (the column config is built outside
 * React, so the strings are resolved there and passed in).
 */
export function complexityColumn<T extends EstimableRow>({
  t,
  myComplexity,
  width = 180,
}: {
  t: Translate;
  myComplexity: string | null;
  width?: number;
}): ColumnType<T> {
  return {
    title: t(COMPLEXITY_TITLE),
    key: "complexity",
    width,
    filterMultiple: false,
    filters: myComplexityFilters(t),
    filteredValue: myComplexity ? [myComplexity] : null,
    render: (_: unknown, row: T) => (
      <ComplexityCell
        complexity={row.complexity}
        myComplexity={row.myComplexity}
      />
    ),
  };
}
