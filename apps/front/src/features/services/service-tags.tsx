// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { components } from "@/api/generated/schema";
import { EnumTag } from "@/components/enum-tag";
import {
  ACTION_STATUS_COLORS,
  ACTION_STATUS_DESCRIPTIONS,
  ACTION_STATUS_LABELS,
  ACTION_TYPE_COLORS,
  ACTION_TYPE_DESCRIPTIONS,
  ACTION_TYPE_LABELS,
  SERVICE_STATUS_COLORS,
  SERVICE_STATUS_DESCRIPTIONS,
  SERVICE_STATUS_LABELS,
  SERVICE_TYPE_COLORS,
  SERVICE_TYPE_DESCRIPTIONS,
  SERVICE_TYPE_LABELS,
} from "@/features/services/labels";

type S = components["schemas"];

export function ServiceStatusTag({ status }: { status: S["ServiceStatus"] }) {
  return (
    <EnumTag
      colors={SERVICE_STATUS_COLORS}
      descriptions={SERVICE_STATUS_DESCRIPTIONS}
      labels={SERVICE_STATUS_LABELS}
      value={status}
    />
  );
}

export function ServiceTypeTag({ type }: { type: S["ServiceType"] }) {
  return (
    <EnumTag
      colors={SERVICE_TYPE_COLORS}
      descriptions={SERVICE_TYPE_DESCRIPTIONS}
      labels={SERVICE_TYPE_LABELS}
      value={type}
    />
  );
}

export function ActionStatusTag({
  status,
}: {
  status: S["ServiceActionStatus"];
}) {
  return (
    <EnumTag
      colors={ACTION_STATUS_COLORS}
      descriptions={ACTION_STATUS_DESCRIPTIONS}
      labels={ACTION_STATUS_LABELS}
      value={status}
    />
  );
}

export function ActionTypeTag({ type }: { type: S["ServiceActionType"] }) {
  return (
    <EnumTag
      colors={ACTION_TYPE_COLORS}
      descriptions={ACTION_TYPE_DESCRIPTIONS}
      labels={ACTION_TYPE_LABELS}
      value={type}
    />
  );
}
