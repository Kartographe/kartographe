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
    <div className={cn(full && "sm:col-span-2")}>
      <dt className="mb-1.5">
        <Typography.Text style={{ fontSize: 12 }} type="secondary">
          {label}
        </Typography.Text>
      </dt>
      <dd className="m-0">{children}</dd>
    </div>
  );
}
