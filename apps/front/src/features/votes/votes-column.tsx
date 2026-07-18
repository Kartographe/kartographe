// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { ColumnType } from "antd/es/table";
import type { components } from "@/api/generated/schema";
import { VOTE_VALUE_LABELS, VOTE_VALUE_ORDER } from "@/features/votes/labels";
import { VotesCell } from "@/features/votes/votes-cell";

type VoteValue = components["schemas"]["VoteValue"];

const VOTES_TITLE = msg`Votes`;

/** The shape a listing row must expose for the votes column (the enriched fields). */
export interface VotableRow {
  votesCountsByValue: Partial<Record<VoteValue, number>>;
  votesCountsByRoleValue: Partial<
    Record<string, Partial<Record<VoteValue, number>>>
  >;
  myVote?: VoteValue | null;
}

type Translate = (descriptor: MessageDescriptor) => string;

/** Ant column filter entries for the caller's own vote (single-select). */
export function myVoteFilters(t: Translate, notVotedLabel: string) {
  return [
    ...VOTE_VALUE_ORDER.map((value) => ({
      text: t(VOTE_VALUE_LABELS[value]),
      value,
    })),
    { text: notVotedLabel, value: "none" },
  ];
}

/**
 * A ready-made "Votes" table column: the compact `VotesCell` plus a single-select
 * header filter on the caller's own vote (`myVote` / not-yet-voted). Slot it in
 * right before the actions column.
 *
 * `t` and `notVotedLabel` come from the caller's `useLingui()` (the column config
 * is built outside React, so the strings are resolved there and passed in).
 */
export function votesColumn<T extends VotableRow>({
  t,
  notVotedLabel,
  myVote,
  width = 210,
}: {
  t: Translate;
  notVotedLabel: string;
  myVote: string | null;
  width?: number;
}): ColumnType<T> {
  return {
    title: t(VOTES_TITLE),
    key: "votes",
    width,
    filterMultiple: false,
    filters: myVoteFilters(t, notVotedLabel),
    filteredValue: myVote ? [myVote] : null,
    render: (_: unknown, row: T) => (
      <VotesCell
        countsByRoleValue={row.votesCountsByRoleValue}
        countsByValue={row.votesCountsByValue}
        myVote={row.myVote}
      />
    ),
  };
}
