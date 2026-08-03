// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { TablePaginationConfig } from "antd";
import type { FilterValue, SorterResult } from "antd/es/table/interface";
import { useState } from "react";
import { useAccountPreferences } from "@/features/preferences/use-account-preferences";

export type PageSize = 10 | 25 | 50 | 100;
export type ListSortOrder = "asc" | "desc";

export const PAGE_SIZES: PageSize[] = [10, 25, 50, 100];

/** The whole state of a listing view — what gets persisted per user & account. */
export interface ListViewState<Sort extends string> {
  /** Ant column key → selected filter values (`[]` when cleared). */
  filters: Record<string, string[]>;
  limit: PageSize;
  page: number;
  sortBy: Sort;
  sortOrder: ListSortOrder;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readFilters(raw: unknown): Record<string, string[]> | null {
  if (!isRecord(raw)) {
    return null;
  }
  const filters: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (Array.isArray(value) && value.every((v) => typeof v === "string")) {
      filters[key] = value;
    }
  }
  return filters;
}

/**
 * Rebuild a view from what the API stored. Preferences are opaque JSON written
 * by an older (or newer) front, so every field is validated and falls back to
 * the caller's default rather than being trusted.
 */
function readStored<Sort extends string>(
  raw: unknown,
  defaults: ListViewState<Sort>,
  sortValues: readonly string[]
): ListViewState<Sort> {
  if (!isRecord(raw)) {
    return defaults;
  }
  const { limit, page, sortBy, sortOrder } = raw;
  return {
    filters: readFilters(raw.filters) ?? defaults.filters,
    limit: PAGE_SIZES.includes(limit as PageSize)
      ? (limit as PageSize)
      : defaults.limit,
    page: typeof page === "number" && page >= 1 ? Math.floor(page) : 1,
    sortBy:
      typeof sortBy === "string" && sortValues.includes(sortBy)
        ? (sortBy as Sort)
        : defaults.sortBy,
    sortOrder:
      sortOrder === "asc" || sortOrder === "desc"
        ? sortOrder
        : defaults.sortOrder,
  };
}

function sameFilters(
  a: Record<string, string[]>,
  b: Record<string, string[]>
): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    const left = a[key] ?? [];
    const right = b[key] ?? [];
    if (left.length !== right.length || left.some((v, i) => v !== right[i])) {
      return false;
    }
  }
  return true;
}

function readSorter<Row>(
  sorter: SorterResult<Row> | SorterResult<Row>[]
): { columnKey: string; order: ListSortOrder } | null {
  const single = Array.isArray(sorter) ? sorter[0] : sorter;
  if (!(single?.order && single.columnKey)) {
    return null;
  }
  return {
    columnKey: String(single.columnKey),
    order: single.order === "ascend" ? "asc" : "desc",
  };
}

/**
 * Listing view state (pagination, sort, column filters) backed by the user's
 * per-account preferences.
 *
 * On mount the view is restored from `AccountUser.preferences["list:<viewKey>"]`;
 * every table change is applied locally and written back. The list query must
 * wait for `ready` — firing it earlier would spend a round-trip on the default
 * view before the stored one arrives.
 *
 * `sortFields` maps Ant column keys onto the API's sort field, and doubles as
 * the whitelist used when reading a stored `sortBy` back.
 */
export function useListView<Row, Sort extends string>(
  accountId: string,
  viewKey: string,
  defaults: ListViewState<Sort>,
  sortFields: Record<string, Sort>
) {
  const { loaded, preferences, setPreference } =
    useAccountPreferences(accountId);
  // Keyed by account: the same component instance survives an account switch,
  // and one account's view must never leak into another's.
  const [local, setLocal] = useState<{
    accountId: string;
    view: ListViewState<Sort>;
  } | null>(null);

  const storageKey = `list:${viewKey}`;
  const stored = loaded
    ? readStored(preferences[storageKey], defaults, Object.values(sortFields))
    : defaults;
  const view = local?.accountId === accountId ? local.view : stored;

  function apply(next: ListViewState<Sort>) {
    setLocal({ accountId, view: next });
    setPreference(storageKey, next);
  }

  function onTableChange(
    pagination: TablePaginationConfig,
    filters: Record<string, FilterValue | null>,
    sorter: SorterResult<Row> | SorterResult<Row>[]
  ) {
    const nextFilters: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(filters)) {
      nextFilters[key] = (value ?? []).map(String);
    }
    const sorted = readSorter(sorter);
    const sortBy = sorted
      ? (sortFields[sorted.columnKey] ?? view.sortBy)
      : view.sortBy;
    const sortOrder = sorted ? sorted.order : view.sortOrder;
    // A new filter or sort invalidates the current page — page 3 of the old
    // result set means nothing in the new one.
    const reset =
      !sameFilters(view.filters, nextFilters) ||
      sortBy !== view.sortBy ||
      sortOrder !== view.sortOrder;

    apply({
      filters: nextFilters,
      limit: (pagination.pageSize as PageSize) ?? view.limit,
      page: reset ? 1 : (pagination.current ?? 1),
      sortBy,
      sortOrder,
    });
  }

  return {
    /** Multi-select column filter, in the shape Ant's `filteredValue` wants. */
    filterValue: (key: string): string[] | null =>
      view.filters[key]?.length ? view.filters[key] : null,
    filters: view.filters,
    /** Single-select column filter (votes, …) — the value or `null`. */
    firstFilterValue: (key: string): string | null =>
      view.filters[key]?.[0] ?? null,
    hasFilters: Object.values(view.filters).some((values) => values.length > 0),
    limit: view.limit,
    onTableChange,
    page: view.page,
    ready: loaded,
    /** Ant's `sortOrder` for a column, given the active sort. */
    sortOrderFor: (columnKey: string): "ascend" | "descend" | null => {
      if (sortFields[columnKey] !== view.sortBy) {
        return null;
      }
      return view.sortOrder === "asc" ? "ascend" : "descend";
    },
    sortBy: view.sortBy,
    sortOrder: view.sortOrder,
  };
}
