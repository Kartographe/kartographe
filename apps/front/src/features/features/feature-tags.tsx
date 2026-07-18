// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { components } from "@/api/generated/schema";
import { EnumTag } from "@/components/enum-tag";
import {
  FEATURE_FILE_STATUS_COLORS,
  FEATURE_FILE_STATUS_DESCRIPTIONS,
  FEATURE_FILE_STATUS_LABELS,
  FEATURE_FILE_TYPE_COLORS,
  FEATURE_FILE_TYPE_DESCRIPTIONS,
  FEATURE_FILE_TYPE_LABELS,
  FEATURE_STATUS_COLORS,
  FEATURE_STATUS_DESCRIPTIONS,
  FEATURE_STATUS_LABELS,
  FEATURE_TYPE_COLORS,
  FEATURE_TYPE_DESCRIPTIONS,
  FEATURE_TYPE_LABELS,
} from "@/features/features/labels";

type S = components["schemas"];

export function FeatureStatusTag({
  status,
  onChange,
  loading,
}: {
  status: S["FeatureStatus"];
  onChange?: (status: S["FeatureStatus"]) => void;
  loading?: boolean;
}) {
  return (
    <EnumTag
      colors={FEATURE_STATUS_COLORS}
      descriptions={FEATURE_STATUS_DESCRIPTIONS}
      labels={FEATURE_STATUS_LABELS}
      loading={loading}
      onChange={onChange}
      value={status}
    />
  );
}

export function FeatureTypeTag({
  type,
  onChange,
  loading,
}: {
  type: S["FeatureType"];
  onChange?: (type: S["FeatureType"]) => void;
  loading?: boolean;
}) {
  return (
    <EnumTag
      colors={FEATURE_TYPE_COLORS}
      descriptions={FEATURE_TYPE_DESCRIPTIONS}
      labels={FEATURE_TYPE_LABELS}
      loading={loading}
      onChange={onChange}
      value={type}
    />
  );
}

export function FeatureFileStatusTag({
  status,
  onChange,
  loading,
}: {
  status: S["FeatureFileStatus"];
  onChange?: (status: S["FeatureFileStatus"]) => void;
  loading?: boolean;
}) {
  return (
    <EnumTag
      colors={FEATURE_FILE_STATUS_COLORS}
      descriptions={FEATURE_FILE_STATUS_DESCRIPTIONS}
      labels={FEATURE_FILE_STATUS_LABELS}
      loading={loading}
      onChange={onChange}
      value={status}
    />
  );
}

export function FeatureFileTypeTag({
  type,
  onChange,
  loading,
}: {
  type: S["FeatureFileType"];
  onChange?: (type: S["FeatureFileType"]) => void;
  loading?: boolean;
}) {
  return (
    <EnumTag
      colors={FEATURE_FILE_TYPE_COLORS}
      descriptions={FEATURE_FILE_TYPE_DESCRIPTIONS}
      labels={FEATURE_FILE_TYPE_LABELS}
      loading={loading}
      onChange={onChange}
      value={type}
    />
  );
}
