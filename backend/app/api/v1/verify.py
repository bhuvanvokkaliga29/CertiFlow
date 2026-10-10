"""Verification API endpoint (public)."""

import structlog
from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.api.dependencies import DBSession
from app.models.models import Certificate, GenerationJob, Recipient
from app.schemas.jobs import VerifyResponse

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/verify", tags=["Verification"])


@router.get("/{public_id}", response_model=VerifyResponse)
async def verify_certificate(public_id: str, db: DBSession):
    """Public certificate verification.

    No authentication required. Returns only public-safe information.
    """
    cert_result = await db.execute(
        select(Certificate).where(Certificate.public_id == public_id)
    )
    cert = cert_result.scalar_one_or_none()

    if not cert:
        raise HTTPException(
            status_code=404,
            detail="Certificate not found. The ID may be invalid or the certificate does not exist."
        )

    r_result = await db.execute(select(Recipient).where(Recipient.id == cert.recipient_id))
    recipient = r_result.scalar_one_or_none()

    job_result = await db.execute(
        select(GenerationJob).where(GenerationJob.id == recipient.job_id)
    )
    job = job_result.scalar_one_or_none()

    return VerifyResponse(
        is_valid=not cert.is_revoked,
        is_revoked=cert.is_revoked,
        certificate_id=cert.public_id,
        holder_name=recipient.full_name if recipient else "Unknown",
        issuing_organization=job.issuer_name if job else "Unknown",
        event_name=job.event_name if job else "Unknown",
        achievement=recipient.achievement if recipient else None,
        issue_date=job.issue_date if job else "",
        issued_at=cert.issued_at,
        revocation_reason=cert.revocation_reason if cert.is_revoked else None,
        revoked_at=cert.revoked_at if cert.is_revoked else None,
    )
