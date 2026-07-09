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
        "name": "api.me.mcp",
        "x-displayName": "Current user › MCP",
        "description": "Consent to MCP authorization requests and manage connected applications.",
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
        "name": "api.journeys.scenarios",
        "x-displayName": "Journeys › Scenarios",
        "description": "Scenarios inside a journey.",
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
        "name": "api.mcp.metadata",
        "x-displayName": "MCP › Discovery",
        "description": "OAuth authorization-server and protected-resource metadata for MCP clients.",
    },
    {
        "name": "api.mcp.oauth",
        "x-displayName": "MCP › OAuth",
        "description": "OAuth 2.1 flow for MCP clients: registration, authorize, token, device, revoke.",
    },
]


def tags_for_api() -> list[dict[str, str]]:
    """Return the registered tag metadata, sorted alphabetically by title.

    Scalar renders tags in the order they appear in `openapi.json`, so sorting
    here keeps the sidebar alphabetical regardless of insertion order above.
    """
    return sorted(API_TAGS, key=lambda tag: (tag.get("x-displayName") or tag["name"]).lower())
