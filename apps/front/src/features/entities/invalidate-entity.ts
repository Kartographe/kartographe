// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { QueryClient } from "@tanstack/react-query";
import type { components } from "@/api/generated/schema";

type EntityType = components["schemas"]["EntityType"];

/**
 * The query-key path templates carrying an entity's data — its listing(s) and
 * its detail. openapi-react-query keys queries by the path *template* (with
 * placeholders), so these strings match every parameterised variant.
 *
 * Used to refresh the enriched counts (`commentCount`, `votesCounts…`, `myVote`)
 * that ride on entities after a comment or a vote changes them.
 */
const ENTITY_QUERY_PATHS: Record<EntityType, string[]> = {
  feature: [
    "/v1/accounts/{account_id}/features",
    "/v1/accounts/{account_id}/features/{feature_id}",
  ],
  application: [
    "/v1/accounts/{account_id}/applications",
    "/v1/accounts/{account_id}/applications/{application_id}",
  ],
  application_route: [
    "/v1/accounts/{account_id}/applications/{application_id}/routes",
  ],
  application_bounded_context: [
    "/v1/accounts/{account_id}/applications/{application_id}/bounded-contexts",
    "/v1/accounts/{account_id}/applications/{application_id}/bounded-contexts/{bounded_context_id}",
    "/v1/accounts/{account_id}/bounded-contexts",
  ],
  application_component: [
    "/v1/accounts/{account_id}/applications/{application_id}/components",
    "/v1/accounts/{account_id}/applications/{application_id}/components/{component_id}",
    "/v1/accounts/{account_id}/components",
  ],
  journey: [
    "/v1/accounts/{account_id}/journeys",
    "/v1/accounts/{account_id}/journeys/{journey_id}",
  ],
  journey_scenario: [
    "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios",
    "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}",
    "/v1/accounts/{account_id}/scenarios",
  ],
  journey_scenario_step: [
    "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}/steps",
  ],
  persona: ["/v1/accounts/{account_id}/personas"],
  database: [
    "/v1/accounts/{account_id}/databases",
    "/v1/accounts/{account_id}/databases/{database_id}",
  ],
  database_table: [
    "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables",
  ],
  database_table_column: [
    "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/columns",
  ],
  database_migration: [
    "/v1/accounts/{account_id}/databases/{database_id}/migrations",
  ],
  database_migration_column: [
    "/v1/accounts/{account_id}/databases/{database_id}/migrations/{database_migration_id}/columns",
  ],
  service: [
    "/v1/accounts/{account_id}/services",
    "/v1/accounts/{account_id}/services/{service_id}",
  ],
  service_action: ["/v1/accounts/{account_id}/services/{service_id}/actions"],
};

/**
 * Invalidate an entity's listing and detail queries — call after a comment or a
 * vote is added/removed so its `commentCount` / vote tallies / `myVote` refresh
 * wherever the entity is shown.
 */
export function invalidateEntityQueries(
  queryClient: QueryClient,
  entityType: EntityType
) {
  for (const path of ENTITY_QUERY_PATHS[entityType]) {
    queryClient.invalidateQueries({ queryKey: ["get", path] });
  }
}
