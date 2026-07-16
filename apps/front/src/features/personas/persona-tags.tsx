// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { components } from "@/api/generated/schema";
import { EnumTag } from "@/components/enum-tag";
import {
  PERSONA_STATUS_COLORS,
  PERSONA_STATUS_DESCRIPTIONS,
  PERSONA_STATUS_LABELS,
  PERSONA_TYPE_COLORS,
  PERSONA_TYPE_DESCRIPTIONS,
  PERSONA_TYPE_LABELS,
} from "@/features/personas/labels";

type S = components["schemas"];

export function PersonaStatusTag({ status }: { status: S["PersonaStatus"] }) {
  return (
    <EnumTag
      colors={PERSONA_STATUS_COLORS}
      descriptions={PERSONA_STATUS_DESCRIPTIONS}
      labels={PERSONA_STATUS_LABELS}
      value={status}
    />
  );
}

export function PersonaTypeTag({ type }: { type: S["PersonaType"] }) {
  return (
    <EnumTag
      colors={PERSONA_TYPE_COLORS}
      descriptions={PERSONA_TYPE_DESCRIPTIONS}
      labels={PERSONA_TYPE_LABELS}
      value={type}
    />
  );
}
