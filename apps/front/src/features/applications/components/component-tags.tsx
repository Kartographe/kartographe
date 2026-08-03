// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { components } from "@/api/generated/schema";
import { EnumTag } from "@/components/enum-tag";
import {
  COMPONENT_STATUS_COLORS,
  COMPONENT_STATUS_DESCRIPTIONS,
  COMPONENT_STATUS_LABELS,
  COMPONENT_TYPE_COLORS,
  COMPONENT_TYPE_DESCRIPTIONS,
  COMPONENT_TYPE_LABELS,
} from "@/features/applications/components/labels";

type S = components["schemas"];

export function ComponentTypeTag({
  type,
  onChange,
  loading,
}: {
  type: S["ApplicationComponentType"];
  onChange?: (type: S["ApplicationComponentType"]) => void;
  loading?: boolean;
}) {
  return (
    <EnumTag
      colors={COMPONENT_TYPE_COLORS}
      descriptions={COMPONENT_TYPE_DESCRIPTIONS}
      labels={COMPONENT_TYPE_LABELS}
      loading={loading}
      onChange={onChange}
      value={type}
    />
  );
}

export function ComponentStatusTag({
  status,
  onChange,
  loading,
}: {
  status: S["ApplicationComponentStatus"];
  onChange?: (status: S["ApplicationComponentStatus"]) => void;
  loading?: boolean;
}) {
  return (
    <EnumTag
      colors={COMPONENT_STATUS_COLORS}
      descriptions={COMPONENT_STATUS_DESCRIPTIONS}
      labels={COMPONENT_STATUS_LABELS}
      loading={loading}
      onChange={onChange}
      value={status}
    />
  );
}
