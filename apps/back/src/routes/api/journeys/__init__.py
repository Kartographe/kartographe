"""`/v1/accounts/{account_id}/journeys/*` — journeys and their scenario/step/
assertion tree.

Mounted under the versioned router, so every endpoint here is also exposed as an
MCP tool. Reads require account membership; writes are role-gated, and every
object is re-checked against the account (and its parent resource) behind the
URL.
"""

from fastapi import APIRouter

from src.routes.api.journeys.comments import router as comments_router
from src.routes.api.journeys.journeys import router as journeys_router
from src.routes.api.journeys.scenarios import router as scenarios_router
from src.routes.api.journeys.step_assertions import router as step_assertions_router
from src.routes.api.journeys.step_files import router as step_files_router
from src.routes.api.journeys.step_routes import router as step_routes_router
from src.routes.api.journeys.steps import router as steps_router

router = APIRouter()
router.include_router(journeys_router)
router.include_router(scenarios_router)
router.include_router(steps_router)
router.include_router(step_files_router)
router.include_router(step_assertions_router)
router.include_router(step_routes_router)
router.include_router(comments_router)
