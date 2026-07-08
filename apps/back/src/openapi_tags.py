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
