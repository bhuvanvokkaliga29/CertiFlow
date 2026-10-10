"""Jobs API endpoints."""

import json
from typing import Optional
from fastapi import APIRouter, Header, HTTPException, Query, UploadFile, File, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.api.dependencies import CurrentUser, CurrentOrg, DBSession
from app.core.config import settings
from app.core.exceptions import NotFoundError, AuthorizationError
from app.models.models import (
    GenerationJob, Recipient, Certificate, AuditEvent, AuditAction,
    JobStatus, RecipientStatus,
)
from app.schemas.jobs import (
    CreateJobRequest, CreateJobResponse, JobStatusResponse,
    RecipientResponse, PaginatedRecipientsResponse,
    CertificateResponse, DashboardStatsResponse,
    CSVValidationResult,
)
from app.services.job_service import (
    create_generation_job, get_job_with_auth, retry_failed_recipients
)
from app.services.csv_service import parse_and_validate_csv
from app.services.audit_service import log_audit_event

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/jobs", tags=["Jobs"])


def _job_to_response(job: GenerationJob) -> JobStatusResponse:
    """Convert a GenerationJob ORM to a response schema."""
    return JobStatusResponse(
        id=job.id,
        organization_id=job.organization_id,
        event_name=job.event_name,
        issuer_name=job.issuer_name,
        achievement_description=job.achievement_description,
        issue_date=job.issue_date,
        signatory_name=job.signatory_name,
        signatory_title=job.signatory_title,
        status=job.status,
        total_count=job.total_count,
        pending_count=job.pending_count,
        processing_count=job.processing_count,
        success_count=job.success_count,
        failed_count=job.failed_count,
        completion_percentage=job.completion_percentage,
        started_at=job.started_at,
        completed_at=job.completed_at,
        created_at=job.created_at,
        updated_at=job.updated_at,
        job_url=f"{settings.PUBLIC_URL}/dashboard/jobs/{job.id}",
    )


@router.post("", status_code=status.HTTP_202_ACCEPTED, response_model=CreateJobResponse)
async def create_job(
    request: CreateJobRequest,
    current_user: CurrentUser,
    current_org: CurrentOrg,
    db: DBSession,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
):
    """Create a new bulk certificate generation job.

    Accepts event details and recipient list. Returns 202 with job ID.
    Processing happens asynchronously in the background.
    """
    job = await create_generation_job(
        db=db,
        request=request,
        user_id=current_user.id,
        organization_id=current_org.id,
        idempotency_key=idempotency_key,
    )

    return CreateJobResponse(
        id=job.id,
        job_id=job.id,
        status=job.status.value if hasattr(job.status, "value") else str(job.status),
        total_recipients=job.total_count,
        message=f"Job accepted. Processing {job.total_count} recipients in the background.",
        job_url=f"{settings.API_V1_STR}/jobs/{job.id}",
    )


@router.post("/csv-validate", response_model=CSVValidationResult)
async def validate_csv(
    file: UploadFile = File(...),
    current_user: CurrentUser = None,
    current_org: CurrentOrg = None,
    db: DBSession = None,
):
    """Validate a CSV file and return column mapping, validation errors, and a preview."""
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a CSV (.csv extension)")

    contents = await file.read()
    if len(contents) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum {settings.MAX_UPLOAD_SIZE_MB}MB allowed."
        )

    try:
        result = parse_and_validate_csv(contents)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return CSVValidationResult(
        total_rows=result["total_rows"],
        valid_rows=result["valid_rows"],
        invalid_rows=result["invalid_rows"],
        duplicate_rows=result["duplicate_rows"],
        errors=result["errors"],
        preview=result["preview"],
        column_mapping=result["column_mapping"],
        valid_recipients=result.get("valid_recipients", []),
    )


@router.get("", response_model=list[JobStatusResponse])
async def list_jobs(
    current_user: CurrentUser,
    current_org: CurrentOrg,
    db: DBSession,
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """List all jobs for the current organization."""
    query = select(GenerationJob).where(
        GenerationJob.organization_id == current_org.id
    ).order_by(GenerationJob.created_at.desc()).limit(limit).offset(offset)

    if status_filter:
        try:
            js = JobStatus(status_filter)
            query = query.where(GenerationJob.status == js)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status_filter}")

    result = await db.execute(query)
    jobs = result.scalars().all()
    return [_job_to_response(j) for j in jobs]


@router.get("/{job_id}", response_model=JobStatusResponse)
async def get_job(
    job_id: str,
    current_user: CurrentUser,
    current_org: CurrentOrg,
    db: DBSession,
):
    """Get job status and progress by job ID."""
    job = await get_job_with_auth(db, job_id, current_org.id)
    return _job_to_response(job)


@router.get("/{job_id}/recipients", response_model=PaginatedRecipientsResponse)
async def get_recipients(
    job_id: str,
    current_user: CurrentUser,
    current_org: CurrentOrg,
    db: DBSession,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    """List recipients for a job with pagination, filtering, and search."""
    await get_job_with_auth(db, job_id, current_org.id)

    query = select(Recipient).where(Recipient.job_id == job_id)

    if status_filter:
        try:
            rs = RecipientStatus(status_filter)
            query = query.where(Recipient.status == rs)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status_filter}")

    if search:
        search_term = f"%{search.strip()[:100]}%"
        from sqlalchemy import or_
        query = query.where(
            or_(
                Recipient.full_name.ilike(search_term),
                Recipient.email.ilike(search_term),
            )
        )

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()

    offset = (page - 1) * per_page
    query = query.order_by(Recipient.created_at).limit(per_page).offset(offset)
    result = await db.execute(query)
    recipients = result.scalars().all()

    return PaginatedRecipientsResponse(
        items=[RecipientResponse.model_validate(r) for r in recipients],
        total=total,
        page=page,
        per_page=per_page,
        pages=(total + per_page - 1) // per_page if total > 0 else 0,
    )


@router.post("/{job_id}/retry-failed")
async def retry_failed(
    job_id: str,
    current_user: CurrentUser,
    current_org: CurrentOrg,
    db: DBSession,
):
    """Retry failed recipients for a job."""
    result = await retry_failed_recipients(
        db=db,
        job_id=job_id,
        organization_id=current_org.id,
        user_id=current_user.id,
    )
    return result


@router.get("/{job_id}/certificates", response_model=list[CertificateResponse])
async def list_certificates(
    job_id: str,
    current_user: CurrentUser,
    current_org: CurrentOrg,
    db: DBSession,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    """List all issued certificates for a job."""
    job = await get_job_with_auth(db, job_id, current_org.id)

    offset = (page - 1) * per_page
    result = await db.execute(
        select(Certificate)
        .join(Recipient, Recipient.id == Certificate.recipient_id)
        .where(Recipient.job_id == job_id)
        .order_by(Certificate.issued_at)
        .limit(per_page)
        .offset(offset)
    )
    certs = result.scalars().all()

    response_items = []
    for cert in certs:
        r_result = await db.execute(select(Recipient).where(Recipient.id == cert.recipient_id))
        recipient = r_result.scalar_one_or_none()
        response_items.append(CertificateResponse(
            id=cert.id,
            public_id=cert.public_id,
            recipient_id=cert.recipient_id,
            recipient_name=recipient.full_name if recipient else "Unknown",
            recipient_email=recipient.email if recipient else None,
            event_name=job.event_name,
            issuer_name=job.issuer_name,
            achievement=recipient.achievement if recipient else job.achievement_description,
            pdf_sha256=cert.file_checksum,
            is_valid=not cert.is_revoked,
            is_revoked=cert.is_revoked,
            revocation_reason=cert.revocation_reason,
            revoked_at=cert.revoked_at,
            issued_at=cert.issued_at,
            download_url=f"{settings.API_V1_STR}/certificates/{cert.id}/download",
            verification_url=f"{settings.PUBLIC_URL}/verify/{cert.public_id}",
        ))

    return response_items


@router.get("/{job_id}/download.zip")
async def download_job_zip(
    job_id: str,
    current_user: CurrentUser,
    current_org: CurrentOrg,
    db: DBSession,
):
    """Download all certificates for a job as a ZIP archive."""
    from fastapi.responses import Response
    from app.services.storage import build_zip_archive

    await get_job_with_auth(db, job_id, current_org.id)

    result = await db.execute(
        select(Certificate, Recipient)
        .join(Recipient, Recipient.id == Certificate.recipient_id)
        .where(Recipient.job_id == job_id, Certificate.is_revoked == False)  # noqa: E712
    )
    rows = result.all()

    if not rows:
        raise HTTPException(status_code=404, detail="No certificates available for download")

    cert_list = [
        (cert.storage_key, recipient.full_name, recipient.id)
        for cert, recipient in rows
    ]
    zip_bytes = build_zip_archive(cert_list)

    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="certificates_{job_id[:8]}.zip"'},
    )


@router.get("/{job_id}/report.csv")
@router.get("/{job_id}/results.csv")
async def download_job_csv_report(
    job_id: str,
    current_user: CurrentUser,
    current_org: CurrentOrg,
    db: DBSession,
):
    """Download a CSV report of job results."""
    from fastapi.responses import Response
    from app.services.csv_service import export_job_csv_report

    await get_job_with_auth(db, job_id, current_org.id)

    recipients_result = await db.execute(
        select(Recipient).where(Recipient.job_id == job_id).order_by(Recipient.created_at)
    )
    recipients = recipients_result.scalars().all()

    certs_result = await db.execute(
        select(Certificate)
        .join(Recipient, Recipient.id == Certificate.recipient_id)
        .where(Recipient.job_id == job_id)
    )
    certs = {c.recipient_id: c for c in certs_result.scalars().all()}

    csv_bytes = export_job_csv_report(recipients, certs)

    return Response(
        content=csv_bytes,
        media_type="text/csv; charset=utf-8-sig",
        headers={"Content-Disposition": f'attachment; filename="job_report_{job_id[:8]}.csv"'},
    )
