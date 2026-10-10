"""API v1 router — aggregates all sub-routers."""

from fastapi import APIRouter

from app.api.v1.audit import router as audit_router
from app.api.v1.auth import router as auth_router
from app.api.v1.certificates import router as certs_router
from app.api.v1.jobs import router as jobs_router
from app.api.v1.verify import router as verify_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(jobs_router)
api_router.include_router(certs_router)
api_router.include_router(verify_router)
api_router.include_router(audit_router)
