// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { components } from "@/api/generated/schema";
import { EnumTag } from "@/components/enum-tag";
import {
  ASSERTION_STATUS_COLORS,
  ASSERTION_STATUS_DESCRIPTIONS,
  ASSERTION_STATUS_LABELS,
  JOURNEY_STATUS_COLORS,
  JOURNEY_STATUS_DESCRIPTIONS,
  JOURNEY_STATUS_LABELS,
  JOURNEY_TYPE_COLORS,
  JOURNEY_TYPE_DESCRIPTIONS,
  JOURNEY_TYPE_LABELS,
  SCENARIO_CRITICITY_COLORS,
  SCENARIO_CRITICITY_DESCRIPTIONS,
  SCENARIO_CRITICITY_LABELS,
  SCENARIO_STATUS_COLORS,
  SCENARIO_STATUS_DESCRIPTIONS,
  SCENARIO_STATUS_LABELS,
  SCENARIO_TYPE_COLORS,
  SCENARIO_TYPE_DESCRIPTIONS,
  SCENARIO_TYPE_LABELS,
  STEP_FILE_STATUS_COLORS,
  STEP_FILE_STATUS_DESCRIPTIONS,
  STEP_FILE_STATUS_LABELS,
  STEP_FILE_TYPE_COLORS,
  STEP_FILE_TYPE_DESCRIPTIONS,
  STEP_FILE_TYPE_LABELS,
} from "@/features/journeys/labels";

type S = components["schemas"];

export function JourneyStatusTag({
  status,
  onChange,
  loading,
}: {
  status: S["JourneyStatus"];
  onChange?: (status: S["JourneyStatus"]) => void;
  loading?: boolean;
}) {
  return (
    <EnumTag
      colors={JOURNEY_STATUS_COLORS}
      descriptions={JOURNEY_STATUS_DESCRIPTIONS}
      labels={JOURNEY_STATUS_LABELS}
      loading={loading}
      onChange={onChange}
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

export function ScenarioStatusTag({
  status,
  onChange,
  loading,
}: {
  status: S["JourneyScenarioStatus"];
  onChange?: (status: S["JourneyScenarioStatus"]) => void;
  loading?: boolean;
}) {
  return (
    <EnumTag
      colors={SCENARIO_STATUS_COLORS}
      descriptions={SCENARIO_STATUS_DESCRIPTIONS}
      labels={SCENARIO_STATUS_LABELS}
      loading={loading}
      onChange={onChange}
      value={status}
    />
  );
}

export function ScenarioTypeTag({ type }: { type: S["JourneyScenarioType"] }) {
  return (
    <EnumTag
      colors={SCENARIO_TYPE_COLORS}
      descriptions={SCENARIO_TYPE_DESCRIPTIONS}
      labels={SCENARIO_TYPE_LABELS}
      value={type}
    />
  );
}

export function ScenarioCriticityTag({
  criticity,
}: {
  criticity: S["JourneyScenarioCriticity"];
}) {
  return (
    <EnumTag
      colors={SCENARIO_CRITICITY_COLORS}
      descriptions={SCENARIO_CRITICITY_DESCRIPTIONS}
      labels={SCENARIO_CRITICITY_LABELS}
      value={criticity}
    />
  );
}

export function StepFileTypeTag({
  type,
}: {
  type: S["JourneyScenarioStepFileType"];
}) {
  return (
    <EnumTag
      colors={STEP_FILE_TYPE_COLORS}
      descriptions={STEP_FILE_TYPE_DESCRIPTIONS}
      labels={STEP_FILE_TYPE_LABELS}
      value={type}
    />
  );
}

export function StepFileStatusTag({
  status,
}: {
  status: S["JourneyScenarioStepFileStatus"];
}) {
  return (
    <EnumTag
      colors={STEP_FILE_STATUS_COLORS}
      descriptions={STEP_FILE_STATUS_DESCRIPTIONS}
      labels={STEP_FILE_STATUS_LABELS}
      value={status}
    />
  );
}

export function AssertionStatusTag({
  status,
  onChange,
  loading,
}: {
  status: S["JourneyScenarioStepAssertionStatus"];
  onChange?: (status: S["JourneyScenarioStepAssertionStatus"]) => void;
  loading?: boolean;
}) {
  return (
    <EnumTag
      colors={ASSERTION_STATUS_COLORS}
      descriptions={ASSERTION_STATUS_DESCRIPTIONS}
      labels={ASSERTION_STATUS_LABELS}
      loading={loading}
      onChange={onChange}
      value={status}
    />
  );
}
