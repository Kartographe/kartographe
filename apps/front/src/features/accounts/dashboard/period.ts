// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import dayjs, { type Dayjs } from "dayjs";

/** A selected period, as inclusive day bounds. */
export interface Period {
  start: Dayjs;
  end: Dayjs;
}

const DAYS_7 = 7;
const DAYS_30 = 30;
const DAYS_90 = 90;

/** The default look-back when the dashboard opens: the last 30 days. */
export function defaultPeriod(): Period {
  const end = dayjs().endOf("day");
  return { start: end.subtract(DAYS_30 - 1, "day").startOf("day"), end };
}

/** Range-picker shortcuts, each a `[start, end]` day pair. */
export const PERIOD_PRESETS: {
  label: MessageDescriptor;
  value: () => [Dayjs, Dayjs];
}[] = [
  {
    label: msg`7 derniers jours`,
    value: () => [
      dayjs()
        .subtract(DAYS_7 - 1, "day")
        .startOf("day"),
      dayjs().endOf("day"),
    ],
  },
  {
    label: msg`30 derniers jours`,
    value: () => [
      dayjs()
        .subtract(DAYS_30 - 1, "day")
        .startOf("day"),
      dayjs().endOf("day"),
    ],
  },
  {
    label: msg`90 derniers jours`,
    value: () => [
      dayjs()
        .subtract(DAYS_90 - 1, "day")
        .startOf("day"),
      dayjs().endOf("day"),
    ],
  },
  {
    label: msg`Ce mois-ci`,
    value: () => [dayjs().startOf("month"), dayjs().endOf("day")],
  },
];
