import { Tag } from "antd";
import type { components } from "@/api/generated/schema";
import { EnumTag } from "@/components/enum-tag";
import {
  APPLICATION_STATUS_COLORS,
  APPLICATION_STATUS_DESCRIPTIONS,
  APPLICATION_STATUS_LABELS,
  APPLICATION_TYPE_COLORS,
  APPLICATION_TYPE_DESCRIPTIONS,
  APPLICATION_TYPE_LABELS,
  DEPLOYMENT_STATUS_COLORS,
  DEPLOYMENT_STATUS_DESCRIPTIONS,
  DEPLOYMENT_STATUS_LABELS,
  ENVIRONMENT_TYPE_COLORS,
  ENVIRONMENT_TYPE_DESCRIPTIONS,
  ENVIRONMENT_TYPE_LABELS,
  GUARD_TYPE_COLORS,
  GUARD_TYPE_DESCRIPTIONS,
  GUARD_TYPE_LABELS,
  ROUTE_METHOD_COLORS,
  VERSION_TYPE_COLORS,
  VERSION_TYPE_DESCRIPTIONS,
  VERSION_TYPE_LABELS,
} from "@/features/applications/labels";

type S = components["schemas"];

export function ApplicationStatusTag({
  status,
}: {
  status: S["ApplicationStatus"];
}) {
  return (
    <EnumTag
      colors={APPLICATION_STATUS_COLORS}
      descriptions={APPLICATION_STATUS_DESCRIPTIONS}
      labels={APPLICATION_STATUS_LABELS}
      value={status}
    />
  );
}

export function ApplicationTypeTag({ type }: { type: S["ApplicationType"] }) {
  return (
    <EnumTag
      colors={APPLICATION_TYPE_COLORS}
      descriptions={APPLICATION_TYPE_DESCRIPTIONS}
      labels={APPLICATION_TYPE_LABELS}
      value={type}
    />
  );
}

export function EnvironmentTypeTag({
  type,
}: {
  type: S["ApplicationEnvironmentType"];
}) {
  return (
    <EnumTag
      colors={ENVIRONMENT_TYPE_COLORS}
      descriptions={ENVIRONMENT_TYPE_DESCRIPTIONS}
      labels={ENVIRONMENT_TYPE_LABELS}
      value={type}
    />
  );
}

export function DeploymentStatusTag({
  status,
}: {
  status: S["ApplicationEnvironmentVersionStatus"];
}) {
  return (
    <EnumTag
      colors={DEPLOYMENT_STATUS_COLORS}
      descriptions={DEPLOYMENT_STATUS_DESCRIPTIONS}
      labels={DEPLOYMENT_STATUS_LABELS}
      value={status}
    />
  );
}

export function VersionTypeTag({
  type,
}: {
  type: S["ApplicationVersionType"];
}) {
  return (
    <EnumTag
      colors={VERSION_TYPE_COLORS}
      descriptions={VERSION_TYPE_DESCRIPTIONS}
      labels={VERSION_TYPE_LABELS}
      value={type}
    />
  );
}

export function GuardTypeTag({ type }: { type: S["ApplicationGuardType"] }) {
  return (
    <EnumTag
      colors={GUARD_TYPE_COLORS}
      descriptions={GUARD_TYPE_DESCRIPTIONS}
      labels={GUARD_TYPE_LABELS}
      value={type}
    />
  );
}

/**
 * Swagger-style solid method badge. The colour is applied by hand rather than
 * through `Tag`'s `color` prop: antd 6 tints the *text* with a custom colour,
 * which leaves the label unreadable on the badge.
 */
export function RouteMethodTag({
  method,
}: {
  method: S["ApplicationRouteMethod"];
}) {
  return (
    <Tag
      style={{
        backgroundColor: ROUTE_METHOD_COLORS[method],
        border: "none",
        color: "#fff",
        fontFamily: "monospace",
        fontWeight: 700,
        marginInlineEnd: 0,
        minWidth: 72,
        textAlign: "center",
        textShadow: "0 1px 0 rgba(0, 0, 0, 0.25)",
      }}
    >
      {method}
    </Tag>
  );
}
