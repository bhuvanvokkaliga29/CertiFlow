"""Health check endpoints — liveness and readiness."""

import structlog
from fastapi import APIRouter

from app.core.database import check_db_connection

logger = structlog.get_logger(__name__)
health_router = APIRouter(prefix="/health", tags=["Health"])


@health_router.get("/live")
async def liveness():
    """Liveness probe — confirms the API process is running."""
    return {"status": "ok", "service": "certiflow-api"}


@health_router.get("/ready")
async def readiness():
    """Readiness probe — confirms all dependencies are reachable."""
    db_ok = await check_db_connection()

    redis_ok = False
    try:
        import redis

        from app.core.config import settings
        r = redis.from_url(settings.REDIS_URL, socket_connect_timeout=1)
        r.ping()
        redis_ok = True
    except Exception:
        redis_ok = False  # Redis is optional in thread mode

    from app.core.config import settings
    is_ready = db_ok  # Redis optional in thread mode

    return {
        "status": "ready" if is_ready else "degraded",
        "database": "ok" if db_ok else "unavailable",
        "redis": "ok" if redis_ok else "unavailable (optional in thread mode)",
        "worker_mode": settings.WORKER_MODE,
    }
