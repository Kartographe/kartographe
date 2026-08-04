// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { components } from "@/api/generated/schema";

type S = components["schemas"];

export const LINK_TYPE_LABELS: Record<S["LinkType"], MessageDescriptor> = {
  ticket: msg`Ticket`,
  documentation: msg`Documentation`,
  design: msg`Design`,
  kartographe: msg`Kartographe`,
  other: msg`Autre`,
};

/**
 * Tag colours, borrowed from Ant Design's preset names so they follow the
 * theme. `kartographe` takes the primary hue: an internal reference is the one
 * kind the app can actually resolve, and reads as "part of this workspace".
 */
export const LINK_TYPE_COLORS: Record<S["LinkType"], string> = {
  ticket: "gold",
  documentation: "blue",
  design: "magenta",
  kartographe: "geekblue",
  other: "default",
};

/** The order the type picker offers, most common first. */
export const LINK_TYPE_ORDER: S["LinkType"][] = [
  "ticket",
  "documentation",
  "design",
  "kartographe",
  "other",
];
