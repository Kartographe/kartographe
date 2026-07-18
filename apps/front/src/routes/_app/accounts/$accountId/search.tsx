// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { createFileRoute } from "@tanstack/react-router";
import { SearchPage } from "@/features/search/search-page";

interface SearchParams {
  q: string;
}

export const Route = createFileRoute("/_app/accounts/$accountId/search")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    q: typeof search.q === "string" ? search.q : "",
  }),
  component: SearchRoutePage,
});

function SearchRoutePage() {
  const { accountId } = Route.useParams();
  const { q } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <SearchPage
      accountId={accountId}
      onQueryChange={(next) => navigate({ replace: true, search: { q: next } })}
      query={q}
    />
  );
}
