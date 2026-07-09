export interface RoutePathSegment {
  text: string;
  isVariable: boolean;
  /** Offset of the segment in the path — a stable React key. */
  start: number;
}

const VARIABLE_PATTERN = /(\{[^{}]*\})/g;

/** Splits `/users/{id}/posts` into its literal and `{variable}` segments. */
export function splitRoutePath(path: string): RoutePathSegment[] {
  const segments: RoutePathSegment[] = [];
  let start = 0;
  for (const text of path.split(VARIABLE_PATTERN)) {
    if (text.length > 0) {
      segments.push({
        text,
        isVariable: text.startsWith("{") && text.endsWith("}"),
        start,
      });
      start += text.length;
    }
  }
  return segments;
}
