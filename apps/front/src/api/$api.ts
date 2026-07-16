// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import createReactQueryClient from "openapi-react-query";
import { fetchClient } from "@/api/client";

export const $api = createReactQueryClient(fetchClient);
