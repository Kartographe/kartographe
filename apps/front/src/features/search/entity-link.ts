// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { components } from "@/api/generated/schema";

type EntityRef = components["schemas"]["EntityRef"];
type EntityType = components["schemas"]["EntityType"];

/**
 * A TanStack Router navigation target (route path + params). `to` is a plain
 * string on purpose — the shell nav uses the same widened shape.
 */
export interface EntityLink {
  to: string;
  params: Record<string, string>;
}

/** The id of the nearest ancestor of `type`, if the breadcrumb carries it. */
function parentId(resource: EntityRef, type: EntityType): string | undefined {
  return resource.parents.find((parent) => parent.type === type)?.id;
}

/**
 * Where to send the user for a search hit's `resource`.
 *
 * Entities with a dedicated detail route are targeted directly; those rendered
 * inside a parent screen (a route under an application, a table/column under a
 * database, a step under a scenario, an action under a service) point at the
 * deepest linkable ancestor, pulling the ancestor ids from `resource.parents`.
 * Migrations span two databases and carry no single parent, so they fall back
 * to the databases index.
 */
export function resolveEntityLink(
  accountId: string,
  resource: EntityRef
): EntityLink {
  const id = resource.id;
  const databasesIndex: EntityLink = {
    to: "/accounts/$accountId/databases",
    params: { accountId },
  };

  switch (resource.type) {
    case "feature":
      return {
        to: "/accounts/$accountId/features/$featureId",
        params: { accountId, featureId: id },
      };
    case "application":
      return {
        to: "/accounts/$accountId/applications/$applicationId",
        params: { accountId, applicationId: id },
      };
    case "application_route": {
      const applicationId = parentId(resource, "application");
      return applicationId
        ? {
            to: "/accounts/$accountId/applications/$applicationId/routes",
            params: { accountId, applicationId },
          }
        : { to: "/accounts/$accountId/applications", params: { accountId } };
    }
    case "journey":
      return {
        to: "/accounts/$accountId/journeys/$journeyId",
        params: { accountId, journeyId: id },
      };
    case "journey_scenario": {
      const journeyId = parentId(resource, "journey");
      return journeyId
        ? {
            to: "/accounts/$accountId/journeys/$journeyId/scenarios/$scenarioId",
            params: { accountId, journeyId, scenarioId: id },
          }
        : { to: "/accounts/$accountId/journeys", params: { accountId } };
    }
    case "journey_scenario_step": {
      const journeyId = parentId(resource, "journey");
      const scenarioId = parentId(resource, "journey_scenario");
      return journeyId && scenarioId
        ? {
            to: "/accounts/$accountId/journeys/$journeyId/scenarios/$scenarioId",
            params: { accountId, journeyId, scenarioId },
          }
        : { to: "/accounts/$accountId/journeys", params: { accountId } };
    }
    case "persona":
      return { to: "/accounts/$accountId/personas", params: { accountId } };
    case "database":
      return {
        to: "/accounts/$accountId/databases/$databaseId",
        params: { accountId, databaseId: id },
      };
    case "database_table":
    case "database_table_column": {
      const databaseId = parentId(resource, "database");
      return databaseId
        ? {
            to: "/accounts/$accountId/databases/$databaseId",
            params: { accountId, databaseId },
          }
        : databasesIndex;
    }
    case "database_migration":
    case "database_migration_column":
      // A migration spans two databases — no single detail route to target.
      return databasesIndex;
    case "service":
      return {
        to: "/accounts/$accountId/services/$serviceId",
        params: { accountId, serviceId: id },
      };
    case "service_action": {
      const serviceId = parentId(resource, "service");
      return serviceId
        ? {
            to: "/accounts/$accountId/services/$serviceId/actions",
            params: { accountId, serviceId },
          }
        : { to: "/accounts/$accountId/services", params: { accountId } };
    }
    default:
      return { to: "/accounts/$accountId", params: { accountId } };
  }
}
