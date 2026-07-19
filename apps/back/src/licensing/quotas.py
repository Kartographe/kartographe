# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Quota keys — the entity types a licence can put a ceiling on.

These are exactly the keys `/v1/accounts/{account_id}/usage` already reports,
promoted from bare strings to an enum so a licence payload can be validated
against them instead of trusting whatever string it carries. `src/managers/
usage.py` is the other side of the contract: every member here is counted
there, and every entity counted there has a member here.

Values are the wire format — they appear in `.lic` payloads, in the usage
report and in the generated frontend client. They are camelCase because the
whole API is (see `serializes/_base.py`), and they must stay stable: renaming
one silently voids that quota in every licence already issued.

Only entity ceilings live here. What a licence *unlocks* rather than *caps* is
`LicensedFeature`.

A caveat worth keeping in view, spelled out in `LICENSING.md`: these cap AGPL
entities, so the code enforcing them is AGPL and anyone may lawfully patch it
out. Quotas are technically enforced in Kartographe Cloud, where we control the
runtime, and contractually enforced on-premise. That is the honest position,
and it is not a bug to be fixed by hiding this file in `ee/`.
"""

from enum import Enum


class QuotaKey(str, Enum):
    """An entity type a licence can cap. Grouped as the usage report groups them."""

    # members
    ACCOUNT_USER = "accountUser"

    # applications
    APPLICATION = "application"
    APPLICATION_VERSION = "applicationVersion"
    APPLICATION_ENVIRONMENT = "applicationEnvironment"
    APPLICATION_ENVIRONMENT_VERSION = "applicationEnvironmentVersion"
    APPLICATION_FEATURE = "applicationFeature"
    APPLICATION_GUARD = "applicationGuard"
    APPLICATION_ROLE = "applicationRole"
    APPLICATION_ROUTE = "applicationRoute"
    APPLICATION_ROUTE_EXAMPLE = "applicationRouteExample"
    APPLICATION_ROUTE_RESPONSE = "applicationRouteResponse"
    APPLICATION_ROUTE_TABLE = "applicationRouteTable"

    # databases
    DATABASE = "database"
    DATABASE_VERSION = "databaseVersion"
    DATABASE_TABLE = "databaseTable"
    DATABASE_TABLE_COLUMN = "databaseTableColumn"
    DATABASE_TABLE_COLUMN_SUBFIELD = "databaseTableColumnSubfield"
    DATABASE_MIGRATION = "databaseMigration"
    DATABASE_MIGRATION_COLUMN = "databaseMigrationColumn"

    # features
    FEATURE = "feature"
    FEATURE_FILE = "featureFile"
    FEATURE_JOURNEY = "featureJourney"

    # journeys
    JOURNEY = "journey"
    JOURNEY_SCENARIO = "journeyScenario"
    JOURNEY_SCENARIO_STEP = "journeyScenarioStep"
    JOURNEY_SCENARIO_STEP_ASSERTION = "journeyScenarioStepAssertion"
    JOURNEY_SCENARIO_STEP_FILE = "journeyScenarioStepFile"
    JOURNEY_SCENARIO_STEP_ROUTE = "journeyScenarioStepRoute"

    # personas
    PERSONA = "persona"

    # services
    SERVICE = "service"
    SERVICE_ACTION = "serviceAction"

    # content
    TAG = "tag"
    COMMENT = "comment"
