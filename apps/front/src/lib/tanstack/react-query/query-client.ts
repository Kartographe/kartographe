// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { MutationCache, QueryClient } from "@tanstack/react-query";
import { extractApiErrorDetail } from "@/api/error-messages";
import { getMessageApi } from "@/lib/antd/message-bridge";

interface MutationMeta {
  successMessage?: string;
  errorMessage?: string;
  noErrorToast?: boolean;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: 30_000,
      },
    },
    mutationCache: new MutationCache({
      onSuccess: (_data, _vars, _ctx, mutation) => {
        const meta = mutation.meta as MutationMeta | undefined;
        if (meta?.successMessage) {
          getMessageApi().success(meta.successMessage);
        }
      },
      onError: (error, _vars, _ctx, mutation) => {
        const meta = mutation.meta as MutationMeta | undefined;
        if (meta?.noErrorToast) {
          return;
        }
        getMessageApi().error(
          meta?.errorMessage ?? extractApiErrorDetail(error)
        );
      },
    }),
  });
}
