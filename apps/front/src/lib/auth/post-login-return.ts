const KEY = "kartographe-post-login-return";

/**
 * Remember where to send the user back after login (e.g. an MCP consent page
 * they hit while logged out). Only same-origin relative paths are stored, to
 * avoid open-redirects.
 */
export function stashPostLoginReturn(path: string): void {
  if (path.startsWith("/") && !path.startsWith("//")) {
    sessionStorage.setItem(KEY, path);
  }
}

export function consumePostLoginReturn(): string | null {
  const value = sessionStorage.getItem(KEY);
  sessionStorage.removeItem(KEY);
  return value;
}
