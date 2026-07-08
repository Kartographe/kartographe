import { $api } from "@/api/$api";

/** The signed-in user's profile, cached under the `/me` query key. */
export function useCurrentUser() {
  return $api.useQuery("get", "/me");
}
