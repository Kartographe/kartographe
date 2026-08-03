// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { components } from "@/api/generated/schema";

type TagEntityType = components["schemas"]["TagEntityType"];

/** What a tag of this type can be attached to. */
export const TAG_ENTITY_TYPE_LABELS: Record<TagEntityType, MessageDescriptor> =
  {
    application: msg`Applications`,
    application_route: msg`Routes`,
    application_guard: msg`Guards`,
    application_component: msg`Composants`,
    feature: msg`Fonctionnalités`,
    journey: msg`Parcours`,
    journey_scenario: msg`Scénarios`,
    journey_scenario_step: msg`Étapes`,
    persona: msg`Personas`,
    database: msg`Bases de données`,
    database_table: msg`Tables`,
    database_table_column: msg`Colonnes`,
  };

/** Sensible starting colours for a new tag: antd's neutral fill on dark text. */
export const DEFAULT_TAG_BACKGROUND = "#f0f0f0";
export const DEFAULT_TAG_TEXT = "#262626";
