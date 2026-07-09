"""`/v1/accounts/{account_id}/databases/*` — databases and their versions,
tables and columns.

Mounted under the versioned router, so every endpoint here is also exposed as an
MCP tool. Reads require account membership; writes are role-gated, and every
object is re-checked against the account (and its parent resource) behind the
URL.
"""

from fastapi import APIRouter

from src.routes.api.databases.column_comments import router as column_comments_router
from src.routes.api.databases.columns import router as columns_router
from src.routes.api.databases.comments import router as comments_router
from src.routes.api.databases.databases import router as databases_router
from src.routes.api.databases.table_comments import router as table_comments_router
from src.routes.api.databases.tables import router as tables_router
from src.routes.api.databases.versions import router as versions_router

router = APIRouter()
router.include_router(databases_router)
router.include_router(versions_router)
router.include_router(tables_router)
router.include_router(columns_router)
router.include_router(comments_router)
router.include_router(table_comments_router)
router.include_router(column_comments_router)
