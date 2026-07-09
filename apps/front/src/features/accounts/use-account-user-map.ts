import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";

type UserRef = components["schemas"]["AccountUserUserRefItem"];

export interface AccountUserLookup {
  /** Display name for a user id (as carried by `ownerId` fields). */
  name: (userId: string) => string;
  /** Full user reference, when the user is still a member of the account. */
  user: (userId: string) => UserRef | undefined;
}

/** Resolves the `ownerId` carried by entities against the account's members. */
export function useAccountUserMap(accountId: string): AccountUserLookup {
  const usersQuery = $api.useQuery("get", "/v1/accounts/{account_id}/users", {
    params: { path: { account_id: accountId } },
  });

  const byId = new Map(
    (usersQuery.data?.items ?? []).map((member) => [
      member.user.id,
      member.user,
    ])
  );

  return {
    user: (userId: string) => byId.get(userId),
    name: (userId: string) => {
      const user = byId.get(userId);
      if (!user) {
        return "—";
      }
      const fullName = [user.firstName, user.lastName]
        .filter(Boolean)
        .join(" ");
      return fullName || user.email;
    },
  };
}
