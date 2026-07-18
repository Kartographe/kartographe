// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { Card, Typography } from "antd";
import type { ReactNode } from "react";
import { cn } from "@/utils/classnames";

/**
 * A friendlier replacement for Ant's bordered `Descriptions` on entity fiches:
 * a responsive, card-framed grid where each field stacks a muted label over its
 * value — no zebra table, no label/value columns fighting for width.
 */
export function OverviewFields({ children }: { children: ReactNode }) {
  return (
    <Card>
      <dl className="m-0 grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
        {children}
      </dl>
    </Card>
  );
}

/**
 * The bare grid cell of {@link OverviewFields}: a `label` block over its value.
 * Takes a `ReactNode` label so callers can prepend affordances (e.g. an inline
 * edit pencil) to the left of the text. Pass `full` to span the whole row.
 */
export function OverviewFieldShell({
  label,
  full,
  children,
}: {
  label: ReactNode;
  full?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn(full && "sm:col-span-2")}>
      <dt className="mb-1.5">{label}</dt>
      <dd className="m-0">{children}</dd>
    </div>
  );
}

/** The muted 12px label text shared by every overview field. */
export function OverviewFieldLabel({ children }: { children: ReactNode }) {
  return (
    <Typography.Text style={{ fontSize: 12 }} type="secondary">
      {children}
    </Typography.Text>
  );
}

/**
 * A single field inside {@link OverviewFields}. Pass `full` for values that need
 * the whole row (rich-text descriptions, long lists…).
 */
export function OverviewField({
  label,
  full,
  children,
}: {
  label: string;
  full?: boolean;
  children: ReactNode;
}) {
  return (
    <OverviewFieldShell
      full={full}
      label={<OverviewFieldLabel>{label}</OverviewFieldLabel>}
    >
      {children}
    </OverviewFieldShell>
  );
}
