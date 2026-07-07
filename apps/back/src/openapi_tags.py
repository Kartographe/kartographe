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
]


def tags_for_api() -> list[dict[str, str]]:
    """Return the registered tag metadata, sorted alphabetically by title.

    Scalar renders tags in the order they appear in `openapi.json`, so sorting
    here keeps the sidebar alphabetical regardless of insertion order above.
    """
    return sorted(API_TAGS, key=lambda tag: (tag.get("x-displayName") or tag["name"]).lower())
