// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  BarChartOutlined,
  BugOutlined,
  BulbOutlined,
  CodeOutlined,
  MinusOutlined,
  QuestionOutlined,
  UserOutlined,
} from "@ant-design/icons";
import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { ReactNode } from "react";
import type { components } from "@/api/generated/schema";

type VoteValue = components["schemas"]["VoteValue"];
type VoteRole = components["schemas"]["VoteRole"];

/** Human label per vote stance. */
export const VOTE_VALUE_LABELS: Record<VoteValue, MessageDescriptor> = {
  upvote: msg`Pour`,
  downvote: msg`Contre`,
  pending_question: msg`Question`,
  dont_know: msg`Ne sait pas`,
};

/** Icon per vote stance. */
export const VOTE_VALUE_ICONS: Record<VoteValue, ReactNode> = {
  upvote: <ArrowUpOutlined />,
  downvote: <ArrowDownOutlined />,
  pending_question: <QuestionOutlined />,
  dont_know: <MinusOutlined />,
};

/** Ant CSS-var color per stance — the sentiment scale (green ↑ / red ↓). */
export const VOTE_VALUE_COLORS: Record<VoteValue, string> = {
  upvote: "var(--ant-color-success)",
  downvote: "var(--ant-color-error)",
  pending_question: "var(--ant-color-warning)",
  dont_know: "var(--ant-color-text-quaternary)",
};

/** Icon per voting role — echoes each role's domain. */
export const VOTE_ROLE_ICONS: Record<VoteRole, ReactNode> = {
  product_owner: <BulbOutlined />,
  developer: <CodeOutlined />,
  qa: <BugOutlined />,
  data_analyst: <BarChartOutlined />,
  other: <UserOutlined />,
};

/** One-letter tag per voting role, for compact cells. */
export const VOTE_ROLE_LETTERS: Record<VoteRole, string> = {
  product_owner: "P",
  developer: "D",
  qa: "Q",
  data_analyst: "A",
  other: "O",
};

/** Presentation order for roles and stances. */
export const VOTE_ROLE_ORDER: VoteRole[] = [
  "product_owner",
  "developer",
  "qa",
  "data_analyst",
  "other",
];

export const VOTE_VALUE_ORDER: VoteValue[] = [
  "upvote",
  "downvote",
  "pending_question",
  "dont_know",
];
