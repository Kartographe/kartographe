# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Tag metadata for the FastAPI app.

Single source of truth for the `openapi_tags=[…]` passed to `FastAPI(...)`.
Each entry carries:
- `name`          — the raw tag identifier (matches `tags=[...]` on routes).
- `x-displayName` — human-readable title shown by Scalar in the sidebar.
- `description`   — short blurb shown above the grouped endpoints.

Every new feature folder under `src/routes/api/<feature>/` should register its
tag here so it renders as a usable grouping in the Scalar doc.
"""

API_TAGS: list[dict[str, str]] = [
    {
        "name": "api.health",
        "x-displayName": "Health",
        "description": "Liveness probe used by uptime monitors.",
    },
    {
        "name": "api.auth",
        "x-displayName": "Authentication",
        "description": "Sign up, sign in, activation, password reset and two-factor verification.",
    },
    {
        "name": "api.me",
        "x-displayName": "Current user",
        "description": "The signed-in user's own profile.",
    },
    {
        "name": "api.me.security",
        "x-displayName": "Current user › Security",
        "description": "Password, authenticator, recovery codes, security keys and activity log.",
    },
    {
        "name": "api.me.integrations",
        "x-displayName": "Current user › Integrations",
        "description": "Consent to authorization requests and manage connected integrations.",
    },
    {
        "name": "api.me.invitations",
        "x-displayName": "Current user › Invitations",
        "description": "List, accept and refuse account invitations addressed to the signed-in user.",
    },
    {
        "name": "api.accounts",
        "x-displayName": "Accounts",
        "description": "Create and manage workspaces the signed-in user belongs to.",
    },
    {
        "name": "api.accounts.me",
        "x-displayName": "Accounts › My membership",
        "description": "The signed-in user's own seat on an account, and their per-account UI preferences.",
    },
    {
        "name": "api.accounts.users",
        "x-displayName": "Accounts › Members",
        "description": "List members of an account and manage their roles.",
    },
    {
        "name": "api.accounts.invitations",
        "x-displayName": "Accounts › Invitations",
        "description": "Invite members to an account and manage pending invitations.",
    },
    {
        "name": "api.accounts.usage",
        "x-displayName": "Accounts › Usage",
        "description": "Live-record counts per tracked entity against the account's quotas.",
    },
    {
        "name": "api.accounts.entitlements",
        "x-displayName": "Accounts › Entitlements",
        "description": "The edition an account runs under and the licensed features unlocked for it.",
    },
    {
        "name": "api.accounts.stats",
        "x-displayName": "Accounts › Statistics",
        "description": "Dashboard statistics: per-entity counts, period deltas and sparkline series.",
    },
    {
        "name": "api.accounts.search",
        "x-displayName": "Accounts › Search",
        "description": "Full-text search across an account's entities and comments.",
    },
    {
        "name": "api.applications",
        "x-displayName": "Applications",
        "description": "Create and manage the applications tracked inside an account.",
    },
    {
        "name": "api.applications.environments",
        "x-displayName": "Applications › Environments",
        "description": "Deployment environments of an application (production, test, …).",
    },
    {
        "name": "api.applications.versions",
        "x-displayName": "Applications › Versions",
        "description": "Released versions of an application.",
    },
    {
        "name": "api.applications.environmentVersions",
        "x-displayName": "Applications › Deployments",
        "description": "Versions deployed onto an environment and their deployment state.",
    },
    {
        "name": "api.applications.features",
        "x-displayName": "Applications › Features",
        "description": "Features attached to an application and their presence window.",
    },
    {
        "name": "api.applications.guards",
        "x-displayName": "Applications › Guards",
        "description": "Authentication guards of an application.",
    },
    {
        "name": "api.applications.roles",
        "x-displayName": "Applications › Roles",
        "description": "Authorization roles of an application.",
    },
    {
        "name": "api.applications.routes",
        "x-displayName": "Applications › Routes",
        "description": "HTTP routes exposed by an application and their contract.",
    },
    {
        "name": "api.applications.routes.responses",
        "x-displayName": "Applications › Route responses",
        "description": "Documented responses of an application route.",
    },
    {
        "name": "api.applications.routes.examples",
        "x-displayName": "Applications › Route examples",
        "description": "Request/response examples of an application route.",
    },
    {
        "name": "api.applications.routes.tables",
        "x-displayName": "Applications › Route tables",
        "description": "Database tables read or written by an application route.",
    },
    {
        "name": "api.features",
        "x-displayName": "Features",
        "description": "Create and manage the features tracked at the account level.",
    },
    {
        "name": "api.features.files",
        "x-displayName": "Features › Files",
        "description": "Files attached to a feature (screenshots, videos, documents).",
    },
    {
        "name": "api.features.journeys",
        "x-displayName": "Features › Journeys",
        "description": "Journeys linked to a feature.",
    },
    {
        "name": "api.personas",
        "x-displayName": "Personas",
        "description": "Create and manage the personas (user archetypes) of an account.",
    },
    {
        "name": "api.journeys",
        "x-displayName": "Journeys",
        "description": "Create and manage user journeys (parcours) of an account.",
    },
    {
        "name": "api.journeys.features",
        "x-displayName": "Journeys › Features",
        "description": "Features linked to a journey — the journey side of the feature ↔ journey pair.",
    },
    {
        "name": "api.journeys.scenarios",
        "x-displayName": "Journeys › Scenarios",
        "description": "Scenarios inside a journey.",
    },
    {
        "name": "api.scenarios",
        "x-displayName": "Scenarios",
        "description": "Account-wide scenario listing across every journey.",
    },
    {
        "name": "api.components",
        "x-displayName": "Components",
        "description": "Account-wide component listing across every application.",
    },
    {
        "name": "api.boundedContexts",
        "x-displayName": "Bounded contexts",
        "description": "Account-wide bounded-context listing across every application.",
    },
    {
        "name": "api.journeys.scenarios.steps",
        "x-displayName": "Journeys › Steps",
        "description": "Steps inside a scenario (a tree of actions).",
    },
    {
        "name": "api.journeys.scenarios.steps.files",
        "x-displayName": "Journeys › Step files",
        "description": "Files attached to a scenario step.",
    },
    {
        "name": "api.journeys.scenarios.steps.assertions",
        "x-displayName": "Journeys › Step assertions",
        "description": "Assertions carried by a scenario step.",
    },
    {
        "name": "api.journeys.scenarios.steps.routes",
        "x-displayName": "Journeys › Step routes",
        "description": "Application routes exercised by a scenario step.",
    },
    {
        "name": "api.services",
        "x-displayName": "Services",
        "description": "Create and manage the services tracked inside an account.",
    },
    {
        "name": "api.services.actions",
        "x-displayName": "Services › Actions",
        "description": "Actions exposed by a service (endpoints, webhooks, events, jobs).",
    },
    {
        "name": "api.services.comments",
        "x-displayName": "Services › Comments",
        "description": "Comments posted on a service.",
    },
    {
        "name": "api.services.actions.comments",
        "x-displayName": "Services › Action comments",
        "description": "Comments posted on a service action.",
    },
    {
        "name": "api.tags",
        "x-displayName": "Tags",
        "description": "Colored labels attachable to an account's entities.",
    },
    {
        "name": "api.comments",
        "x-displayName": "Comments",
        "description": "Account-wide comment management: read, edit, remove, delete and reply.",
    },
    {
        "name": "api.applications.comments",
        "x-displayName": "Applications › Comments",
        "description": "Comments posted on an application.",
    },
    {
        "name": "api.applications.routes.comments",
        "x-displayName": "Applications › Route comments",
        "description": "Comments posted on an application route.",
    },
    {
        "name": "api.features.comments",
        "x-displayName": "Features › Comments",
        "description": "Comments posted on a feature.",
    },
    {
        "name": "api.journeys.comments",
        "x-displayName": "Journeys › Comments",
        "description": "Comments posted on a journey.",
    },
    {
        "name": "api.journeys.scenarios.comments",
        "x-displayName": "Journeys › Scenario comments",
        "description": "Comments posted on a journey scenario.",
    },
    {
        "name": "api.journeys.scenarios.steps.comments",
        "x-displayName": "Journeys › Step comments",
        "description": "Comments posted on a journey scenario step.",
    },
    {
        "name": "api.personas.comments",
        "x-displayName": "Personas › Comments",
        "description": "Comments posted on a persona.",
    },
    {
        "name": "api.databases.comments",
        "x-displayName": "Databases › Comments",
        "description": "Comments posted on a database.",
    },
    {
        "name": "api.databases.versions.tables.comments",
        "x-displayName": "Databases › Table comments",
        "description": "Comments posted on a database table.",
    },
    {
        "name": "api.databases.versions.tables.columns.comments",
        "x-displayName": "Databases › Column comments",
        "description": "Comments posted on a database column.",
    },
    {
        "name": "api.databases.migrations.comments",
        "x-displayName": "Databases › Migration comments",
        "description": "Comments posted on a database migration.",
    },
    {
        "name": "api.databases.migrations.columns.comments",
        "x-displayName": "Databases › Migration column comments",
        "description": "Comments posted on a migration column step.",
    },
    {
        "name": "api.core.actionTypes",
        "x-displayName": "Core › Action types",
        "description": "Global catalogue of the actions a scenario step can perform.",
    },
    {
        "name": "api.core.assertionTypes",
        "x-displayName": "Core › Assertion types",
        "description": "Global catalogue of the assertions a scenario step can carry.",
    },
    {
        "name": "api.core.databaseColumnTypes",
        "x-displayName": "Core › Column types",
        "description": "Global catalogue of SQL column types per database engine.",
    },
    {
        "name": "api.databases",
        "x-displayName": "Databases",
        "description": "Create and manage the databases tracked inside an account.",
    },
    {
        "name": "api.databases.versions",
        "x-displayName": "Databases › Versions",
        "description": "Versions of a database's schema.",
    },
    {
        "name": "api.databases.versions.tables",
        "x-displayName": "Databases › Tables",
        "description": "Tables within a database version.",
    },
    {
        "name": "api.databases.versions.tables.columns",
        "x-displayName": "Databases › Columns",
        "description": "Columns of a database table.",
    },
    {
        "name": "api.databases.versions.tables.columns.subfields",
        "x-displayName": "Databases › Column sub-fields",
        "description": "Nested JSON sub-fields of a database column.",
    },
    {
        "name": "api.databases.versions.tables.indexes",
        "x-displayName": "Databases › Indexes",
        "description": "Indexes declared on a database table.",
    },
    {
        "name": "api.databases.versions.tables.constraints",
        "x-displayName": "Databases › Constraints",
        "description": "Constraints declared on a database table.",
    },
    {
        "name": "api.databases.migrations",
        "x-displayName": "Databases › Migrations",
        "description": "Planned moves from a version of a database to a version of another.",
    },
    {
        "name": "api.databases.migrations.columns",
        "x-displayName": "Databases › Migration columns",
        "description": "Column-level steps of a database migration.",
    },
    {
        "name": "api.oauth.metadata",
        "x-displayName": "OAuth › Discovery",
        "description": "OAuth authorization-server and protected-resource metadata for clients.",
    },
    {
        "name": "api.oauth",
        "x-displayName": "OAuth",
        "description": "OAuth 2.1 flow for connected integrations: registration, authorize, token, device, revoke.",
    },
    {
        "name": "api.votes",
        "x-displayName": "Votes",
        "description": "Account-wide vote listing, and casting a vote on any entity.",
    },
    {
        "name": "api.complexities",
        "x-displayName": "Complexities",
        "description": "Account-wide complexity listing, the account's scales, and estimating any entity.",
    },
    {
        "name": "api.links",
        "x-displayName": "Links",
        "description": (
            "Account-wide reference management: list, attach to any entity, read, edit, delete, "
            "and preview a URL before saving it."
        ),
    },
    {
        "name": "api.features.links",
        "x-displayName": "Features › References",
        "description": "References attached to a feature.",
    },
    {
        "name": "api.applications.links",
        "x-displayName": "Applications › References",
        "description": "References attached to an application.",
    },
    {
        "name": "api.journeys.links",
        "x-displayName": "Journeys › References",
        "description": "References attached to a journey.",
    },
    {
        "name": "api.services.links",
        "x-displayName": "Services › References",
        "description": "References attached to a service.",
    },
    {
        "name": "api.databases.links",
        "x-displayName": "Databases › References",
        "description": "References attached to a database.",
    },
    {
        "name": "api.features.votes",
        "x-displayName": "Features › Votes",
        "description": "Votes cast on a feature.",
    },
    {
        "name": "api.features.complexities",
        "x-displayName": "Features › Complexity",
        "description": "Complexity estimates on a feature.",
    },
    {
        "name": "api.applications.votes",
        "x-displayName": "Applications › Votes",
        "description": "Votes cast on an application.",
    },
    {
        "name": "api.applications.complexities",
        "x-displayName": "Applications › Complexity",
        "description": "Complexity estimates on an application.",
    },
    {
        "name": "api.applications.routes.votes",
        "x-displayName": "Applications › Route votes",
        "description": "Votes cast on an application route.",
    },
    {
        "name": "api.applications.routes.complexities",
        "x-displayName": "Applications › Route complexity",
        "description": "Complexity estimates on an application route.",
    },
    {
        "name": "api.applications.components",
        "x-displayName": "Applications › Components",
        "description": "Building blocks an application is made of (front, back, library, worker, integration).",
    },
    {
        "name": "api.applications.components.tables",
        "x-displayName": "Applications › Component tables",
        "description": "Database tables an application component works with.",
    },
    {
        "name": "api.applications.components.comments",
        "x-displayName": "Applications › Component comments",
        "description": "Comments on an application component.",
    },
    {
        "name": "api.applications.components.votes",
        "x-displayName": "Applications › Component votes",
        "description": "Votes on an application component.",
    },
    {
        "name": "api.applications.components.complexities",
        "x-displayName": "Applications › Component complexity",
        "description": "Complexity estimates on an application component.",
    },
    {
        "name": "api.applications.boundedContexts",
        "x-displayName": "Applications › Bounded contexts",
        "description": "Named areas of an application's domain and the components inside them.",
    },
    {
        "name": "api.applications.boundedContexts.comments",
        "x-displayName": "Applications › Bounded context comments",
        "description": "Comments on an application bounded context.",
    },
    {
        "name": "api.applications.boundedContexts.votes",
        "x-displayName": "Applications › Bounded context votes",
        "description": "Votes on an application bounded context.",
    },
    {
        "name": "api.applications.boundedContexts.complexities",
        "x-displayName": "Applications › Bounded context complexity",
        "description": "Complexity estimates on an application bounded context.",
    },
    {
        "name": "api.journeys.votes",
        "x-displayName": "Journeys › Votes",
        "description": "Votes cast on a journey.",
    },
    {
        "name": "api.journeys.complexities",
        "x-displayName": "Journeys › Complexity",
        "description": "Complexity estimates on a journey.",
    },
    {
        "name": "api.journeys.scenarios.votes",
        "x-displayName": "Journeys › Scenario votes",
        "description": "Votes cast on a scenario.",
    },
    {
        "name": "api.journeys.scenarios.complexities",
        "x-displayName": "Journeys › Scenario complexity",
        "description": "Complexity estimates on a scenario.",
    },
    {
        "name": "api.journeys.scenarios.steps.votes",
        "x-displayName": "Journeys › Step votes",
        "description": "Votes cast on a scenario step.",
    },
    {
        "name": "api.journeys.scenarios.steps.complexities",
        "x-displayName": "Journeys › Step complexity",
        "description": "Complexity estimates on a scenario step.",
    },
    {
        "name": "api.personas.votes",
        "x-displayName": "Personas › Votes",
        "description": "Votes cast on a persona.",
    },
    {
        "name": "api.personas.complexities",
        "x-displayName": "Personas › Complexity",
        "description": "Complexity estimates on a persona.",
    },
    {
        "name": "api.services.votes",
        "x-displayName": "Services › Votes",
        "description": "Votes cast on a service.",
    },
    {
        "name": "api.services.complexities",
        "x-displayName": "Services › Complexity",
        "description": "Complexity estimates on a service.",
    },
    {
        "name": "api.services.actions.votes",
        "x-displayName": "Services › Action votes",
        "description": "Votes cast on a service action.",
    },
    {
        "name": "api.services.actions.complexities",
        "x-displayName": "Services › Action complexity",
        "description": "Complexity estimates on a service action.",
    },
    {
        "name": "api.databases.votes",
        "x-displayName": "Databases › Votes",
        "description": "Votes cast on a database.",
    },
    {
        "name": "api.databases.complexities",
        "x-displayName": "Databases › Complexity",
        "description": "Complexity estimates on a database.",
    },
    {
        "name": "api.databases.versions.tables.votes",
        "x-displayName": "Databases › Table votes",
        "description": "Votes cast on a database table.",
    },
    {
        "name": "api.databases.versions.tables.complexities",
        "x-displayName": "Databases › Table complexity",
        "description": "Complexity estimates on a table.",
    },
    {
        "name": "api.databases.versions.tables.columns.votes",
        "x-displayName": "Databases › Column votes",
        "description": "Votes cast on a database column.",
    },
    {
        "name": "api.databases.versions.tables.columns.complexities",
        "x-displayName": "Databases › Column complexity",
        "description": "Complexity estimates on a column.",
    },
    {
        "name": "api.databases.migrations.votes",
        "x-displayName": "Databases › Migration votes",
        "description": "Votes cast on a database migration.",
    },
    {
        "name": "api.databases.migrations.complexities",
        "x-displayName": "Databases › Migration complexity",
        "description": "Complexity estimates on a migration.",
    },
    {
        "name": "api.databases.migrations.columns.votes",
        "x-displayName": "Databases › Migration column votes",
        "description": "Votes cast on a migration column step.",
    },
    {
        "name": "api.databases.migrations.columns.complexities",
        "x-displayName": "Databases › Migration column complexity",
        "description": "Complexity estimates on a migration column.",
    },
]


def tags_for_api() -> list[dict[str, str]]:
    """Return the registered tag metadata, sorted alphabetically by title.

    Scalar renders tags in the order they appear in `openapi.json`, so sorting
    here keeps the sidebar alphabetical regardless of insertion order above.
    """
    return sorted(API_TAGS, key=lambda tag: (tag.get("x-displayName") or tag["name"]).lower())
