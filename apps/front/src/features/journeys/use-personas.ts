// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { $api } from "@/api/$api";

/** Matches the pickers below: an account with more personas pages beyond it. */
const PERSONAS_LIMIT = 100;

/**
 * The account's personas, for the pickers on journeys and scenarios and for
 * rendering the `personasIds` those carry back.
 */
export function usePersonas(accountId: string) {
  const query = $api.useQuery("get", "/v1/accounts/{account_id}/personas", {
    params: {
      path: { account_id: accountId },
      query: { limit: PERSONAS_LIMIT },
    },
  });
  const personas = query.data?.items ?? [];
  const titles = new Map(
    personas.map((persona) => [persona.id, persona.title])
  );

  return {
    personas,
    isLoading: query.isLoading,
    options: personas.map((persona) => ({
      value: persona.id,
      label: persona.title,
    })),
    /**
     * Antd column filters — same shape as `useTagFilters`. The values are
     * persona ids, which map straight onto a listing's `personasIds` query
     * param: the filtering runs server-side ("targets at least one of these"),
     * so it stays correct across pages rather than only filtering the page in
     * hand.
     */
    filters: personas.map((persona) => ({
      text: persona.title,
      value: persona.id,
    })),
    /** `personaId` → its title, or `null` when it falls outside the page. */
    title: (id: string) => titles.get(id) ?? null,
  };
}
