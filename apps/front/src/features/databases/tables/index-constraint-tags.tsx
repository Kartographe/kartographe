// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { components } from "@/api/generated/schema";
import { EnumTag } from "@/components/enum-tag";
import {
  CONSTRAINT_TYPE_COLORS,
  CONSTRAINT_TYPE_DESCRIPTIONS,
  CONSTRAINT_TYPE_LABELS,
  INDEX_TYPE_COLORS,
  INDEX_TYPE_DESCRIPTIONS,
  INDEX_TYPE_LABELS,
} from "@/features/databases/tables/labels";

type S = components["schemas"];

export function IndexTypeTag({ type }: { type: S["IndexType"] }) {
  return (
    <EnumTag
      colors={INDEX_TYPE_COLORS}
      descriptions={INDEX_TYPE_DESCRIPTIONS}
      labels={INDEX_TYPE_LABELS}
      value={type}
    />
  );
}

export function ConstraintTypeTag({ type }: { type: S["ConstraintType"] }) {
  return (
    <EnumTag
      colors={CONSTRAINT_TYPE_COLORS}
      descriptions={CONSTRAINT_TYPE_DESCRIPTIONS}
      labels={CONSTRAINT_TYPE_LABELS}
      value={type}
    />
  );
}
