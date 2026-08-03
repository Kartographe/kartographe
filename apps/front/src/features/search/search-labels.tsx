// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import {
  ApiOutlined,
  AppstoreOutlined,
  BlockOutlined,
  BranchesOutlined,
  BulbOutlined,
  CloudServerOutlined,
  CommentOutlined,
  DatabaseOutlined,
  NodeIndexOutlined,
  ProductOutlined,
  TableOutlined,
  TeamOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { ReactNode } from "react";
import type { components } from "@/api/generated/schema";

type SearchEntityType = components["schemas"]["SearchEntityType"];

/** Human label per searchable entity type. */
export const SEARCH_ENTITY_TYPE_LABELS: Record<
  SearchEntityType,
  MessageDescriptor
> = {
  feature: msg`Fonctionnalité`,
  application: msg`Application`,
  application_route: msg`Route`,
  application_component: msg`Composant`,
  journey: msg`Parcours`,
  persona: msg`Persona`,
  database: msg`Base de données`,
  database_table: msg`Table`,
  database_table_column: msg`Colonne`,
  database_migration: msg`Migration`,
  database_migration_column: msg`Colonne de migration`,
  service: msg`Service`,
  service_action: msg`Action`,
  journey_scenario: msg`Scénario`,
  journey_scenario_step: msg`Étape`,
  comment: msg`Commentaire`,
};

/** Ant Design tag color per type (grouped by domain family). */
export const SEARCH_ENTITY_TYPE_COLORS: Record<SearchEntityType, string> = {
  feature: "gold",
  application: "geekblue",
  application_route: "geekblue",
  application_component: "geekblue",
  journey: "purple",
  persona: "magenta",
  database: "cyan",
  database_table: "cyan",
  database_table_column: "cyan",
  database_migration: "blue",
  database_migration_column: "blue",
  service: "green",
  service_action: "green",
  journey_scenario: "purple",
  journey_scenario_step: "purple",
  comment: "default",
};

/** Icon per type — mirrors the sidebar's domain iconography. */
export const SEARCH_ENTITY_TYPE_ICONS: Record<SearchEntityType, ReactNode> = {
  feature: <BulbOutlined />,
  application: <AppstoreOutlined />,
  application_route: <ApiOutlined />,
  application_component: <BlockOutlined />,
  journey: <NodeIndexOutlined />,
  persona: <TeamOutlined />,
  database: <DatabaseOutlined />,
  database_table: <TableOutlined />,
  database_table_column: <TableOutlined />,
  database_migration: <BranchesOutlined />,
  database_migration_column: <BranchesOutlined />,
  service: <CloudServerOutlined />,
  service_action: <ThunderboltOutlined />,
  journey_scenario: <ProductOutlined />,
  journey_scenario_step: <ProductOutlined />,
  comment: <CommentOutlined />,
};

/** The order facets and grouped results are presented in. */
export const SEARCH_ENTITY_TYPE_ORDER: SearchEntityType[] = [
  "feature",
  "journey",
  "journey_scenario",
  "journey_scenario_step",
  "persona",
  "database",
  "database_table",
  "database_table_column",
  "database_migration",
  "database_migration_column",
  "application",
  "application_route",
  "application_component",
  "service",
  "service_action",
  "comment",
];
