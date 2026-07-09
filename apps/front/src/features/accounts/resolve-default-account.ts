import type { QueryClient } from "@tanstack/react-query";
import { $api } from "@/api/$api";
import { useActiveAccountStore } from "@/features/accounts/active-account-store";

// Matches the switcher's page size. A user with more accounts than this would
// see a remembered account past the cap treated as stale; harmless, they just
// land on their first account instead of the last one they used.
const ACCOUNTS_LIMIT = 100;

/**
 * Decides which account `/` opens, and reconciles the remembered account with
 * what the user can actually access.
 *
 * The remembered id survives sign-out, so it may belong to a previous user on
 * this browser or to an account since deleted. Resolving it against the real
 * list is what stops a stale id from leaking into the next session.
 *
 * Returns the account to open, or `null` when the user has none — the only case
 * where `/` renders instead of redirecting.
 */
export async function resolveDefaultAccount(
  queryClient: QueryClient
): Promise<string | null> {
  let accounts: { id: string }[];
  try {
    const data = await queryClient.fetchQuery(
      $api.queryOptions("get", "/v1/accounts", {
        params: { query: { limit: ACCOUNTS_LIMIT } },
      })
    );
    accounts = data.items ?? [];
  } catch {
    // Can't tell stale from unreachable — keep the memory, stay on `/`.
    return null;
  }

  const { accountId: remembered, setAccountId } =
    useActiveAccountStore.getState();

  if (remembered) {
    if (accounts.some((account) => account.id === remembered)) {
      return remembered;
    }
    setAccountId(null);
  }

  return accounts[0]?.id ?? null;
}
