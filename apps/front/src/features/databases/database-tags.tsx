import type { components } from "@/api/generated/schema";
import { EnumTag } from "@/components/enum-tag";
import {
  DATABASE_STATUS_COLORS,
  DATABASE_STATUS_DESCRIPTIONS,
  DATABASE_STATUS_LABELS,
  DATABASE_TYPE_COLORS,
  DATABASE_TYPE_DESCRIPTIONS,
  DATABASE_TYPE_LABELS,
  MIGRATION_COLUMN_STATUS_COLORS,
  MIGRATION_COLUMN_STATUS_DESCRIPTIONS,
  MIGRATION_COLUMN_STATUS_LABELS,
  MIGRATION_COLUMN_TYPE_COLORS,
  MIGRATION_COLUMN_TYPE_DESCRIPTIONS,
  MIGRATION_COLUMN_TYPE_LABELS,
  MIGRATION_STATUS_COLORS,
  MIGRATION_STATUS_DESCRIPTIONS,
  MIGRATION_STATUS_LABELS,
  MIGRATION_TYPE_COLORS,
  MIGRATION_TYPE_DESCRIPTIONS,
  MIGRATION_TYPE_LABELS,
  TABLE_STATUS_COLORS,
  TABLE_STATUS_DESCRIPTIONS,
  TABLE_STATUS_LABELS,
  TABLE_TYPE_COLORS,
  TABLE_TYPE_DESCRIPTIONS,
  TABLE_TYPE_LABELS,
  VERSION_STATUS_COLORS,
  VERSION_STATUS_DESCRIPTIONS,
  VERSION_STATUS_LABELS,
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

export function VersionStatusTag({
  status,
}: {
  status: S["DatabaseVersionStatus"];
}) {
  return (
    <EnumTag
      colors={VERSION_STATUS_COLORS}
      descriptions={VERSION_STATUS_DESCRIPTIONS}
      labels={VERSION_STATUS_LABELS}
      value={status}
    />
  );
}

export function MigrationTypeTag({
  type,
}: {
  type: S["DatabaseMigrationType"];
}) {
  return (
    <EnumTag
      colors={MIGRATION_TYPE_COLORS}
      descriptions={MIGRATION_TYPE_DESCRIPTIONS}
      labels={MIGRATION_TYPE_LABELS}
      value={type}
    />
  );
}

export function MigrationStatusTag({
  status,
}: {
  status: S["DatabaseMigrationStatus"];
}) {
  return (
    <EnumTag
      colors={MIGRATION_STATUS_COLORS}
      descriptions={MIGRATION_STATUS_DESCRIPTIONS}
      labels={MIGRATION_STATUS_LABELS}
      value={status}
    />
  );
}

export function MigrationColumnTypeTag({
  type,
}: {
  type: S["DatabaseMigrationColumnType"];
}) {
  return (
    <EnumTag
      colors={MIGRATION_COLUMN_TYPE_COLORS}
      descriptions={MIGRATION_COLUMN_TYPE_DESCRIPTIONS}
      labels={MIGRATION_COLUMN_TYPE_LABELS}
      value={type}
    />
  );
}

export function MigrationColumnStatusTag({
  status,
}: {
  status: S["DatabaseMigrationColumnStatus"];
}) {
  return (
    <EnumTag
      colors={MIGRATION_COLUMN_STATUS_COLORS}
      descriptions={MIGRATION_COLUMN_STATUS_DESCRIPTIONS}
      labels={MIGRATION_COLUMN_STATUS_LABELS}
      value={status}
    />
  );
}
