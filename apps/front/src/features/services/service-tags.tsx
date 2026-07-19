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
  SERVICE_CATEGORY_COLORS,
  SERVICE_CATEGORY_DESCRIPTIONS,
  SERVICE_CATEGORY_LABELS,
  SERVICE_STATUS_COLORS,
  SERVICE_STATUS_DESCRIPTIONS,
  SERVICE_STATUS_LABELS,
  SERVICE_TYPE_COLORS,
  SERVICE_TYPE_DESCRIPTIONS,
  SERVICE_TYPE_LABELS,
} from "@/features/services/labels";

type S = components["schemas"];

export function ServiceStatusTag({
  status,
  onChange,
  loading,
}: {
  status: S["ServiceStatus"];
  onChange?: (status: S["ServiceStatus"]) => void;
  loading?: boolean;
}) {
  return (
    <EnumTag
      colors={SERVICE_STATUS_COLORS}
      descriptions={SERVICE_STATUS_DESCRIPTIONS}
      labels={SERVICE_STATUS_LABELS}
      loading={loading}
      onChange={onChange}
      value={status}
    />
  );
}

export function ServiceTypeTag({
  type,
  onChange,
  loading,
}: {
  type: S["ServiceType"];
  onChange?: (type: S["ServiceType"]) => void;
  loading?: boolean;
}) {
  return (
    <EnumTag
      colors={SERVICE_TYPE_COLORS}
      descriptions={SERVICE_TYPE_DESCRIPTIONS}
      labels={SERVICE_TYPE_LABELS}
      loading={loading}
      onChange={onChange}
      value={type}
    />
  );
}

export function ServiceCategoryTag({
  category,
  onChange,
  loading,
}: {
  category: S["ServiceCategory"];
  onChange?: (category: S["ServiceCategory"]) => void;
  loading?: boolean;
}) {
  return (
    <EnumTag
      colors={SERVICE_CATEGORY_COLORS}
      descriptions={SERVICE_CATEGORY_DESCRIPTIONS}
      labels={SERVICE_CATEGORY_LABELS}
      loading={loading}
      onChange={onChange}
      value={category}
    />
  );
}

export function ActionStatusTag({
  status,
  onChange,
  loading,
}: {
  status: S["ServiceActionStatus"];
  onChange?: (status: S["ServiceActionStatus"]) => void;
  loading?: boolean;
}) {
  return (
    <EnumTag
      colors={ACTION_STATUS_COLORS}
      descriptions={ACTION_STATUS_DESCRIPTIONS}
      labels={ACTION_STATUS_LABELS}
      loading={loading}
      onChange={onChange}
      value={status}
    />
  );
}

export function ActionTypeTag({
  type,
  onChange,
  loading,
}: {
  type: S["ServiceActionType"];
  onChange?: (type: S["ServiceActionType"]) => void;
  loading?: boolean;
}) {
  return (
    <EnumTag
      colors={ACTION_TYPE_COLORS}
      descriptions={ACTION_TYPE_DESCRIPTIONS}
      labels={ACTION_TYPE_LABELS}
      loading={loading}
      onChange={onChange}
      value={type}
    />
  );
}
