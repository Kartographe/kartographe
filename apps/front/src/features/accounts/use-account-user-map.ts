import { $api } from "@/api/$api";

/**
 * Resolves a user id (as carried by `ownerId` fields) to a display name,
 * using the account's member list.
 */
export function useAccountUserMap(accountId: string) {
  const usersQuery = $api.useQuery("get", "/v1/accounts/{account_id}/users", {
    params: { path: { account_id: accountId } },
  });

  const byId = new Map(
    (usersQuery.data?.items ?? []).map((member) => [
      member.user.id,
      member.user,
    ])
  );

  return function displayName(userId: string): string {
    const user = byId.get(userId);
    if (!user) {
      return "—";
    }
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
    return name || user.email;
  };
}
