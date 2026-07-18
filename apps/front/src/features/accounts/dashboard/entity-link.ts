// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { components } from "@/api/generated/schema";

type EntityRef = components["schemas"]["EntityRef"];
type EntityType = components["schemas"]["EntityType"];
type EntityNode = components["schemas"]["EntityNode"];

/** A resolved router target, in the shape TanStack `<Link>` expects. */
export interface EntityTarget {
  to: string;
  params: Record<string, string>;
}

/** The id of the nearest ancestor of the given type, if the ref carries one. */
function parentId(parents: EntityNode[], type: EntityType): string | undefined {
  return parents.find((node) => node.type === type)?.id;
}

/**
 * The deepest addressable route for the entity a comment or vote points at,
 * resolving the parent chain so a scenario links to its exact page and a nested
 * target (step, column) falls back to the closest ancestor that has a route.
 * Returns `null` when the target has been deleted or can't be addressed.
 */
export function entityLink(
  accountId: string,
  entity: EntityRef | null | undefined
): EntityTarget | null {
  if (!entity) {
    return null;
  }

  const { id, type, parents } = entity;
  const base = { accountId };

  switch (type) {
    case "feature":
      return {
        to: "/accounts/$accountId/features/$featureId",
        params: { ...base, featureId: id },
      };
    case "journey":
      return {
        to: "/accounts/$accountId/journeys/$journeyId",
        params: { ...base, journeyId: id },
      };
    case "journey_scenario": {
      const journeyId = parentId(parents, "journey");
      return journeyId
        ? {
            to: "/accounts/$accountId/journeys/$journeyId/scenarios/$scenarioId",
            params: { ...base, journeyId, scenarioId: id },
          }
        : null;
    }
    case "journey_scenario_step": {
      const journeyId = parentId(parents, "journey");
      const scenarioId = parentId(parents, "journey_scenario");
      return journeyId && scenarioId
        ? {
            to: "/accounts/$accountId/journeys/$journeyId/scenarios/$scenarioId",
            params: { ...base, journeyId, scenarioId },
          }
        : null;
    }
    case "persona":
      return { to: "/accounts/$accountId/personas", params: base };
    case "application":
      return {
        to: "/accounts/$accountId/applications/$applicationId",
        params: { ...base, applicationId: id },
      };
    case "application_route": {
      const applicationId = parentId(parents, "application");
      return applicationId
        ? {
            to: "/accounts/$accountId/applications/$applicationId/routes",
            params: { ...base, applicationId },
          }
        : null;
    }
    case "database":
      return {
        to: "/accounts/$accountId/databases/$databaseId",
        params: { ...base, databaseId: id },
      };
    case "database_table":
    case "database_table_column": {
      const databaseId = parentId(parents, "database");
      return databaseId
        ? {
            to: "/accounts/$accountId/databases/$databaseId",
            params: { ...base, databaseId },
          }
        : null;
    }
    case "database_migration": {
      const databaseId = parentId(parents, "database");
      return databaseId
        ? {
            to: "/accounts/$accountId/databases/$databaseId/migrations/$migrationId",
            params: { ...base, databaseId, migrationId: id },
          }
        : null;
    }
    case "database_migration_column": {
      const databaseId = parentId(parents, "database");
      const migrationId = parentId(parents, "database_migration");
      return databaseId && migrationId
        ? {
            to: "/accounts/$accountId/databases/$databaseId/migrations/$migrationId",
            params: { ...base, databaseId, migrationId },
          }
        : null;
    }
    case "service":
      return {
        to: "/accounts/$accountId/services/$serviceId",
        params: { ...base, serviceId: id },
      };
    case "service_action": {
      const serviceId = parentId(parents, "service");
      return serviceId
        ? {
            to: "/accounts/$accountId/services/$serviceId/actions",
            params: { ...base, serviceId },
          }
        : null;
    }
    default:
      return null;
  }
}
