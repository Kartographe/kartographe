import { $api } from "@/api/$api";

/**
 * Count of the signed-in user's invitations that are still actionable:
 * standby and not past their expiry. Drives the red badge in the user menu and
 * the main sidebar user item.
 */
export function usePendingInvitationsCount(): number {
  const query = $api.useQuery("get", "/me/invitations");
  const items = query.data?.items ?? [];
  const now = Date.now();
  return items.filter(
    (invitation) =>
      invitation.status === "standby" &&
      (!invitation.expireDate ||
        new Date(invitation.expireDate).getTime() > now)
  ).length;
}
