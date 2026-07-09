import type { components } from "@/api/generated/schema";
import { EnumTag } from "@/components/enum-tag";
import {
  JOURNEY_STATUS_COLORS,
  JOURNEY_STATUS_DESCRIPTIONS,
  JOURNEY_STATUS_LABELS,
  JOURNEY_TYPE_COLORS,
  JOURNEY_TYPE_DESCRIPTIONS,
  JOURNEY_TYPE_LABELS,
} from "@/features/journeys/labels";

type S = components["schemas"];

export function JourneyStatusTag({ status }: { status: S["JourneyStatus"] }) {
  return (
    <EnumTag
      colors={JOURNEY_STATUS_COLORS}
      descriptions={JOURNEY_STATUS_DESCRIPTIONS}
      labels={JOURNEY_STATUS_LABELS}
      value={status}
    />
  );
}

export function JourneyTypeTag({ type }: { type: S["JourneyType"] }) {
  return (
    <EnumTag
      colors={JOURNEY_TYPE_COLORS}
      descriptions={JOURNEY_TYPE_DESCRIPTIONS}
      labels={JOURNEY_TYPE_LABELS}
      value={type}
    />
  );
}
