"""Certificates API endpoints — download, verify, revoke."""

from datetime import UTC

import structlog
from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy import select

from app.api.dependencies import CurrentOrg, CurrentUser, DBSession
from app.core.config import settings
from app.models.models import AuditAction, Certificate, GenerationJob, Recipient
from app.schemas.jobs import CertificateResponse, RevokeRequest, VerifyResponse
from app.services.audit_service import log_audit_event
from app.services.storage import read_certificate

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/certificates", tags=["Certificates"])


@router.get("", response_model=list[CertificateResponse])
async def list_certificates(
    current_user: CurrentUser,
    current_org: CurrentOrg,
    db: DBSession,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """List all issued certificates for the current organization."""
    query = (
        select(Certificate, Recipient, GenerationJob)
        .join(Recipient, Recipient.id == Certificate.recipient_id)
        .join(GenerationJob, GenerationJob.id == Recipient.job_id)
        .where(GenerationJob.organization_id == current_org.id)
        .order_by(Certificate.issued_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(query)
    rows = result.all()

    response_items = []
    for cert, recipient, job in rows:
        response_items.append(
            CertificateResponse(
                id=cert.id,
                public_id=cert.public_id,
                recipient_id=cert.recipient_id,
                recipient_name=recipient.full_name,
                recipient_email=recipient.email,
                event_name=job.event_name,
                issuer_name=job.issuer_name,
                achievement=recipient.achievement or job.achievement_description,
                pdf_sha256=cert.file_checksum,
                is_valid=not cert.is_revoked,
                is_revoked=cert.is_revoked,
                revocation_reason=cert.revocation_reason,
                revoked_at=cert.revoked_at,
                issued_at=cert.issued_at,
                download_url=f"{settings.API_V1_STR}/certificates/{cert.id}/download",
                verification_url=f"{settings.PUBLIC_URL}/verify/{cert.public_id}",
            )
        )
    return response_items


@router.get("/{certificate_id}", response_model=CertificateResponse)
async def get_certificate(
    certificate_id: str,
    current_user: CurrentUser,
    current_org: CurrentOrg,
    db: DBSession,
):
    """Get single certificate details by certificate ID or public ID."""
    cert_result = await db.execute(
        select(Certificate).where(
            (Certificate.id == certificate_id) | (Certificate.public_id == certificate_id)
        )
    )
    cert = cert_result.scalar_one_or_none()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")

    r_result = await db.execute(select(Recipient).where(Recipient.id == cert.recipient_id))
    recipient = r_result.scalar_one_or_none()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")

    job_result = await db.execute(
        select(GenerationJob).where(GenerationJob.id == recipient.job_id)
    )
    job = job_result.scalar_one_or_none()
    if not job or job.organization_id != current_org.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this certificate")

    return CertificateResponse(
        id=cert.id,
        public_id=cert.public_id,
        recipient_id=cert.recipient_id,
        recipient_name=recipient.full_name,
        recipient_email=recipient.email,
        event_name=job.event_name,
        issuer_name=job.issuer_name,
        achievement=recipient.achievement or job.achievement_description,
        pdf_sha256=cert.file_checksum,
        is_valid=not cert.is_revoked,
        is_revoked=cert.is_revoked,
        revocation_reason=cert.revocation_reason,
        revoked_at=cert.revoked_at,
        issued_at=cert.issued_at,
        download_url=f"{settings.API_V1_STR}/certificates/{cert.id}/download",
        verification_url=f"{settings.PUBLIC_URL}/verify/{cert.public_id}",
    )


@router.get("/{certificate_id}/download")
async def download_certificate(
    certificate_id: str,
    current_user: CurrentUser,
    current_org: CurrentOrg,
    db: DBSession,
    inline: bool = Query(False),
):
    """Download or view inline a single certificate PDF.

    Authorization: Certificate must belong to a job in the user's organization.
    Revoked certificates are still downloadable for historical records (labeled in filename).
    """
    cert_result = await db.execute(
        select(Certificate).where(
            (Certificate.id == certificate_id) | (Certificate.public_id == certificate_id)
        )
    )
    cert = cert_result.scalar_one_or_none()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")

    # Authorize: verify this cert belongs to user's org
    r_result = await db.execute(select(Recipient).where(Recipient.id == cert.recipient_id))
    recipient = r_result.scalar_one_or_none()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")

    job_result = await db.execute(
        select(GenerationJob).where(GenerationJob.id == recipient.job_id)
    )
    job = job_result.scalar_one_or_none()
    if not job or job.organization_id != current_org.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this certificate")

    try:
        pdf_bytes = read_certificate(cert.storage_key)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Certificate file not found on server")

    # Audit log
    await log_audit_event(
        db,
        action=AuditAction.CERTIFICATE_DOWNLOADED,
        organization_id=current_org.id,
        actor_id=current_user.id,
        actor_email=current_user.email,
        resource_type="Certificate",
        resource_id=cert.id,
        metadata={"public_id": cert.public_id, "revoked": cert.is_revoked, "inline": inline},
    )
    await db.commit()

    revoked_suffix = "_REVOKED" if cert.is_revoked else ""
    filename = f"certificate_{cert.public_id[:8]}{revoked_suffix}.pdf"
    disposition = "inline" if inline else "attachment"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'{disposition}; filename="{filename}"'},
    )


@router.get("/{certificate_id}/preview")
async def preview_certificate(
    certificate_id: str,
    current_user: CurrentUser,
    current_org: CurrentOrg,
    db: DBSession,
):
    """View certificate PDF inline inside the web viewer."""
    return await download_certificate(
        certificate_id=certificate_id,
        current_user=current_user,
        current_org=current_org,
        db=db,
        inline=True,
    )


@router.post("/{certificate_id}/revoke", status_code=status.HTTP_200_OK)
async def revoke_certificate(
    certificate_id: str,
    request: RevokeRequest,
    current_user: CurrentUser,
    current_org: CurrentOrg,
    db: DBSession,
):
    """Revoke a certificate. Records reason, actor, timestamp, and audit event."""
    from datetime import datetime

    cert_result = await db.execute(
        select(Certificate).where(Certificate.id == certificate_id)
    )
    cert = cert_result.scalar_one_or_none()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")

    if cert.is_revoked:
        raise HTTPException(status_code=409, detail="Certificate is already revoked")

    # Authorization check
    r_result = await db.execute(select(Recipient).where(Recipient.id == cert.recipient_id))
    recipient = r_result.scalar_one_or_none()
    job_result = await db.execute(
        select(GenerationJob).where(GenerationJob.id == recipient.job_id)
    )
    job = job_result.scalar_one_or_none()
    if not job or job.organization_id != current_org.id:
        raise HTTPException(status_code=403, detail="Not authorized to revoke this certificate")

    cert.is_revoked = True
    cert.revocation_reason = request.reason
    cert.revoked_at = datetime.now(UTC)
    cert.revoked_by_id = current_user.id

    await log_audit_event(
        db,
        action=AuditAction.CERTIFICATE_REVOKED,
        organization_id=current_org.id,
        actor_id=current_user.id,
        actor_email=current_user.email,
        resource_type="Certificate",
        resource_id=cert.id,
        metadata={
            "public_id": cert.public_id,
            "reason": request.reason,
            "recipient_name": recipient.full_name if recipient else None,
        },
    )
    await db.commit()

    return {
        "message": "Certificate revoked successfully",
        "certificate_id": cert.id,
        "public_id": cert.public_id,
        "revoked_at": cert.revoked_at.isoformat(),
    }


@router.get("/verify/{public_id}", response_model=VerifyResponse)
async def verify_certificate_by_public_id(public_id: str, db: DBSession):
    """Public certificate verification endpoint.

    Returns only public-safe information. Never exposes email, file paths, or account data.
    """
    cert_result = await db.execute(
        select(Certificate).where(Certificate.public_id == public_id)
    )
    cert = cert_result.scalar_one_or_none()

    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found or invalid ID")

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
