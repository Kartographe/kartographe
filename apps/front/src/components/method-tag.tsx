// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { Tag } from "antd";
import type { components } from "@/api/generated/schema";

/** Application routes and service actions share the same HTTP method union. */
type HttpMethod = components["schemas"]["ApplicationRouteMethod"];

/**
 * Swagger UI's opblock palette — hex values are data here (they drive the
 * method badges and the operation block tints), not theme tokens.
 */
export const HTTP_METHOD_COLORS: Record<HttpMethod, string> = {
  GET: "#61affe",
  POST: "#49cc90",
  PATCH: "#50e3c2",
  PUT: "#fca130",
  DELETE: "#f93e3e",
  QUERY: "#9012fe",
};

/** Swagger tints its opblocks with the method colour at 10% opacity. */
export function tintMethod(hex: string): string {
  return `${hex}1a`;
}

/**
 * Swagger-style solid method badge. The colour is applied by hand rather than
 * through `Tag`'s `color` prop: antd 6 tints the *text* with a custom colour,
 * which leaves the label unreadable on the badge.
 */
export function MethodTag({ method }: { method: HttpMethod }) {
  return (
    <Tag
      style={{
        backgroundColor: HTTP_METHOD_COLORS[method],
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
