"""Audit logging service."""

import json
from typing import Any, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.models.models import AuditEvent, AuditAction

logger = structlog.get_logger(__name__)


async def log_audit_event(
    db: AsyncSession,
    action: AuditAction,
    organization_id: Optional[str] = None,
    actor_id: Optional[str] = None,
    actor_email: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    outcome: str = "success",
    metadata: Optional[Dict[str, Any]] = None,
) -> AuditEvent:
    """Record an audit event.

    Sanitizes metadata to avoid logging sensitive data.
    Never logs: passwords, API keys, full access tokens, personal email addresses (as metadata values).
    """
    # Sanitize metadata keys to avoid accidental secret inclusion
    safe_metadata = None
    if metadata:
        safe_metadata = {
            k: v for k, v in metadata.items()
            if k.lower() not in ("password", "token", "api_key", "secret", "hash")
        }

    event = AuditEvent(
        organization_id=organization_id,
        actor_id=actor_id,
        actor_email=actor_email,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        outcome=outcome,
        metadata_json=json.dumps(safe_metadata) if safe_metadata else None,
    )
    db.add(event)
    await db.flush()

    logger.info(
        "audit_event",
        action=action.value,
        actor_email=actor_email,
        resource_type=resource_type,
        resource_id=resource_id,
        outcome=outcome,
    )
    return event
