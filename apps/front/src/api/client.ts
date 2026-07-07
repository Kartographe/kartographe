import createClient from "openapi-fetch";
import type { paths } from "@/api/generated/schema";
import { env } from "@/lib/env/env";

export const fetchClient = createClient<paths>({
  baseUrl: env.VITE_API_URL,
  credentials: "include",
});
