// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { splitRoutePath } from "@/lib/route-path/route-path";

/** Renders an API path, highlighting its `{variable}` segments. */
export function RoutePath({
  path,
  size = 14,
}: {
  path: string;
  size?: number;
}) {
  return (
    <span style={{ fontFamily: "monospace", fontSize: size, fontWeight: 600 }}>
      {splitRoutePath(path).map((segment) =>
        segment.isVariable ? (
          <span
            key={segment.start}
            style={{
              background: "var(--ant-color-primary-bg)",
              borderRadius: 4,
              color: "var(--ant-color-primary)",
              padding: "0 3px",
            }}
          >
            {segment.text}
          </span>
        ) : (
          <span key={segment.start}>{segment.text}</span>
        )
      )}
    </span>
  );
}
