import type { components } from "@/api/generated/schema";
import { EnumTag } from "@/components/enum-tag";
import {
  DATABASE_STATUS_COLORS,
  DATABASE_STATUS_DESCRIPTIONS,
  DATABASE_STATUS_LABELS,
  DATABASE_TYPE_COLORS,
  DATABASE_TYPE_DESCRIPTIONS,
  DATABASE_TYPE_LABELS,
  TABLE_STATUS_COLORS,
  TABLE_STATUS_DESCRIPTIONS,
  TABLE_STATUS_LABELS,
  TABLE_TYPE_COLORS,
  TABLE_TYPE_DESCRIPTIONS,
  TABLE_TYPE_LABELS,
} from "@/features/databases/labels";

type S = components["schemas"];

export function DatabaseStatusTag({ status }: { status: S["DatabaseStatus"] }) {
  return (
    <EnumTag
      colors={DATABASE_STATUS_COLORS}
      descriptions={DATABASE_STATUS_DESCRIPTIONS}
      labels={DATABASE_STATUS_LABELS}
      value={status}
    />
  );
}

export function DatabaseTypeTag({ type }: { type: S["DatabaseType"] }) {
  return (
    <EnumTag
      colors={DATABASE_TYPE_COLORS}
      descriptions={DATABASE_TYPE_DESCRIPTIONS}
      labels={DATABASE_TYPE_LABELS}
      value={type}
    />
  );
}

export function TableStatusTag({
  status,
}: {
  status: S["DatabaseTableStatus"];
}) {
  return (
    <EnumTag
      colors={TABLE_STATUS_COLORS}
      descriptions={TABLE_STATUS_DESCRIPTIONS}
      labels={TABLE_STATUS_LABELS}
      value={status}
    />
  );
}

export function TableTypeTag({ type }: { type: S["DatabaseTableType"] }) {
  return (
    <EnumTag
      colors={TABLE_TYPE_COLORS}
      descriptions={TABLE_TYPE_DESCRIPTIONS}
      labels={TABLE_TYPE_LABELS}
      value={type}
    />
  );
}
