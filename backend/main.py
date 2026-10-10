"""CertiFlow Backend - Main application entry point."""

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.health import health_router
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exceptions import CertiFlowException
from app.core.logging import configure_logging

configure_logging()
logger = structlog.get_logger(__name__)


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="CertiFlow API",
        description="Bulk Certificate Generation, Verification & Lifecycle Management Platform",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Global exception handler
    @app.exception_handler(CertiFlowException)
    async def certiflow_exception_handler(request: Request, exc: CertiFlowException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": exc.error_code,
                "message": exc.message,
                "detail": exc.detail,
            },
        )

    # Routers
    app.include_router(health_router)
    app.include_router(api_router, prefix=settings.API_V1_STR)

    @app.on_event("startup")
    async def startup_event():
        logger.info("certiflow_startup", environment=settings.APP_ENV, api_prefix=settings.API_V1_STR)

    return app


app = create_app()
