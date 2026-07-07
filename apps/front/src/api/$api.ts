import createReactQueryClient from "openapi-react-query";
import { fetchClient } from "@/api/client";

export const $api = createReactQueryClient(fetchClient);
