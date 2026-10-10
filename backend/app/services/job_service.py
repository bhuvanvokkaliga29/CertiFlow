"""Core job processing service — business logic for certificate generation.

This service is the heart of CertiFlow:
- Creates generation jobs and recipients in a single transaction
- Dispatches background work (thread or Celery)
- Updates job/recipient state machine
- Handles per-recipient failure isolation
"""

import hashlib
import json
import uuid
from datetime import UTC, datetime

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import AuthorizationError, ConflictError, JobStateError, NotFoundError
from app.models.models import (
    AuditAction,
    Certificate,
    GenerationJob,
    IdempotencyRecord,
    JobStatus,
    Organization,
    Recipient,
    RecipientStatus,
)
from app.schemas.jobs import CreateJobRequest
from app.services.audit_service import log_audit_event

logger = structlog.get_logger(__name__)


def _build_request_fingerprint(request: CreateJobRequest) -> str:
    """Compute a stable fingerprint for an idempotency check."""
    # Normalize and hash the request body (event info + sorted recipient names/emails)
    normalized = {
        "event_name": request.event_name.strip().lower(),
        "issuer_name": request.issuer_name.strip().lower(),
        "issue_date": request.issue_date,
        "recipients": sorted(
            [{"full_name": r.full_name.strip().lower(), "email": (r.email or "").lower()}
             for r in request.recipients],
            key=lambda x: x["full_name"],
        ),
    }
    return hashlib.sha256(json.dumps(normalized, sort_keys=True).encode()).hexdigest()


async def get_organization_for_user(db: AsyncSession, user_id: str) -> Organization:
    """Get the primary organization for a user (first membership)."""
    from app.models.models import OrganizationMember
    result = await db.execute(
        select(Organization)
        .join(OrganizationMember, OrganizationMember.organization_id == Organization.id)
        .where(OrganizationMember.user_id == user_id)
        .limit(1)
    )
    org = result.scalar_one_or_none()
    if not org:
        raise NotFoundError("Organization", "for current user")
    return org


async def check_idempotency(
    db: AsyncSession,
    idempotency_key: str,
    organization_id: str,
    fingerprint: str,
) -> GenerationJob | None:
    """Check if this idempotency key has been used before.

    Returns:
        The existing job if the key matches and fingerprint matches.
        Raises ConflictError if fingerprint differs (different request reusing same key).
    """
    result = await db.execute(
        select(IdempotencyRecord).where(
            IdempotencyRecord.idempotency_key == idempotency_key,
            IdempotencyRecord.organization_id == organization_id,
        )
    )
    record = result.scalar_one_or_none()

    if not record:
        return None

    if record.request_fingerprint != fingerprint:
        raise ConflictError(
            "Idempotency key already used with a different request. "
            "Use a new idempotency key for a different job.",
            detail={"idempotency_key": idempotency_key},
        )

    # Same key, same fingerprint — return existing job
    if record.job_id:
        job_result = await db.execute(
            select(GenerationJob).where(GenerationJob.id == record.job_id)
        )
        return job_result.scalar_one_or_none()
    return None


async def create_generation_job(
    db: AsyncSession,
    request: CreateJobRequest,
    user_id: str,
    organization_id: str,
    idempotency_key: str | None = None,
) -> GenerationJob:
    """Create a new generation job with all recipients in one transaction.

    Returns the created job. Dispatches background processing.
    """
    fingerprint = _build_request_fingerprint(request)

    # Idempotency check
    if idempotency_key:
        existing = await check_idempotency(db, idempotency_key, organization_id, fingerprint)
        if existing:
            logger.info("idempotency_hit", job_id=existing.id, key=idempotency_key)
            return existing

    # Create the job
    job = GenerationJob(
        id=str(uuid.uuid4()),
        organization_id=organization_id,
        created_by_id=user_id,
        event_name=request.event_name,
        issuer_name=request.issuer_name,
        achievement_description=request.achievement_description,
        issue_date=request.issue_date,
        signatory_name=request.signatory_name,
        signatory_title=request.signatory_title,
        status=JobStatus.QUEUED,
        total_count=len(request.recipients),
        pending_count=len(request.recipients),
        processing_count=0,
        success_count=0,
        failed_count=0,
    )
    db.add(job)
    await db.flush()  # Get job.id

    # Create all recipients
    recipients = []
    for r in request.recipients:
        recipient = Recipient(
            id=str(uuid.uuid4()),
            job_id=job.id,
            full_name=r.full_name,
            email=r.email,
            institution=r.institution,
            achievement=r.achievement,
            status=RecipientStatus.PENDING,
            retry_count=0,
        )
        db.add(recipient)
        recipients.append(recipient)
    await db.flush()

    # Record idempotency key
    if idempotency_key:
        idem = IdempotencyRecord(
            idempotency_key=idempotency_key,
            organization_id=organization_id,
            request_fingerprint=fingerprint,
            job_id=job.id,
        )
        db.add(idem)
        await db.flush()

    # Audit event
    from app.models.models import User
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()

    await log_audit_event(
        db,
        action=AuditAction.JOB_CREATED,
        organization_id=organization_id,
        actor_id=user_id,
        actor_email=user.email if user else None,
        resource_type="GenerationJob",
        resource_id=job.id,
        metadata={"event_name": request.event_name, "recipient_count": len(recipients)},
    )

    await db.commit()

    logger.info("job_created", job_id=job.id, recipient_count=len(recipients))

    # Dispatch background processing
    _dispatch_job(job.id)

    return job


def _dispatch_job(job_id: str) -> None:
    """Dispatch the job to the background worker.

    Supports two modes:
    - thread: simple ThreadPoolExecutor (for local dev without Redis)
    - celery: full Celery task queue
    """
    if settings.WORKER_MODE == "celery":
        try:
            from app.workers.tasks import process_generation_job
            process_generation_job.delay(job_id)
            logger.info("job_dispatched_celery", job_id=job_id)
        except Exception as e:
            logger.error("celery_dispatch_failed", job_id=job_id, error=str(e))
            # Fall back to thread
            _dispatch_thread(job_id)
    else:
        _dispatch_thread(job_id)


def _dispatch_thread(job_id: str) -> None:
    """Run job processing in a background thread."""
    import threading
    thread = threading.Thread(
        target=_run_job_in_thread,
        args=(job_id,),
        daemon=True,
        name=f"certiflow-job-{job_id[:8]}",
    )
    thread.start()
    logger.info("job_dispatched_thread", job_id=job_id)


def _run_job_in_thread(job_id: str) -> None:
    """Entry point for thread-based job processing."""
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(_process_job_async(job_id))
    except Exception as e:
        logger.error("thread_job_failed", job_id=job_id, error=str(e))
    finally:
        loop.close()


async def _process_job_async(job_id: str) -> None:
    """Process all recipients for a job. Core generation logic."""
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        try:
            # Mark job as PROCESSING
            job_result = await db.execute(
                select(GenerationJob).where(GenerationJob.id == job_id)
            )
            job = job_result.scalar_one_or_none()
            if not job:
                logger.error("job_not_found_in_worker", job_id=job_id)
                return

            if job.status not in (JobStatus.QUEUED, JobStatus.PARTIALLY_FAILED):
                logger.warning("job_already_processed", job_id=job_id, status=job.status)
                return

            job.status = JobStatus.PROCESSING
            job.started_at = datetime.now(UTC)
            await db.commit()

            # Fetch all PENDING recipients
            recipients_result = await db.execute(
                select(Recipient).where(
                    Recipient.job_id == job_id,
                    Recipient.status == RecipientStatus.PENDING,
                )
            )
            recipients = recipients_result.scalars().all()

            verification_base = f"{settings.PUBLIC_URL}/verify"

            for recipient in recipients:
                await _process_recipient(db, job, recipient, verification_base)

            # Finalize job state
            await _finalize_job(db, job)

        except Exception as e:
            logger.error("job_processing_error", job_id=job_id, error=str(e), exc_info=True)
            try:
                async with AsyncSessionLocal() as err_db:
                    err_result = await err_db.execute(
                        select(GenerationJob).where(GenerationJob.id == job_id)
                    )
                    err_job = err_result.scalar_one_or_none()
                    if err_job:
                        err_job.status = JobStatus.FAILED
                        err_job.completed_at = datetime.now(UTC)
                        await err_db.commit()
            except Exception:
                pass


async def _process_recipient(
    db: AsyncSession,
    job: GenerationJob,
    recipient: Recipient,
    verification_base: str,
) -> None:
    """Process a single recipient — isolated failure handling."""
    from app.services.certificate_renderer import compute_sha256, render_certificate_pdf
    from app.services.storage import build_storage_key, write_certificate

    try:
        # Mark PROCESSING
        recipient.status = RecipientStatus.PROCESSING
        recipient.started_at = datetime.now(UTC)
        await db.commit()

        # Generate a stable public_id for QR/verification
        public_id = str(uuid.uuid4())
        verification_url = f"{verification_base}/{public_id}"
        storage_key = build_storage_key(job.id, recipient.id)

        # Render PDF (expensive — done outside of long transaction)
        pdf_bytes = render_certificate_pdf(
            recipient_name=recipient.full_name,
            event_name=job.event_name,
            issuer_name=job.issuer_name,
            achievement_description=job.achievement_description,
            achievement=recipient.achievement,
            issue_date=job.issue_date,
            signatory_name=job.signatory_name,
            signatory_title=job.signatory_title,
            certificate_id=public_id,
            verification_url=verification_url,
            recipient_institution=recipient.institution,
        )

        checksum = compute_sha256(pdf_bytes)
        write_certificate(storage_key, pdf_bytes)

        # Persist certificate record
        cert = Certificate(
            id=str(uuid.uuid4()),
            recipient_id=recipient.id,
            public_id=public_id,
            storage_key=storage_key,
            file_checksum=checksum,
            is_revoked=False,
        )
        db.add(cert)

        # Update recipient
        recipient.status = RecipientStatus.SUCCEEDED
        recipient.completed_at = datetime.now(UTC)

        # Update job counters
        job.pending_count = max(0, job.pending_count - 1)
        job.success_count += 1

        await db.commit()
        logger.info("recipient_processed", recipient_id=recipient.id, cert_id=public_id)

    except Exception as e:
        logger.error(
            "recipient_processing_failed",
            recipient_id=recipient.id,
            error=str(e),
        )
        # Record failure without stopping other recipients
        try:
            recipient.status = RecipientStatus.FAILED
            recipient.error_code = type(e).__name__
            recipient.error_message = str(e)[:900]
            recipient.completed_at = datetime.now(UTC)
            job.pending_count = max(0, job.pending_count - 1)
            job.failed_count += 1
            await db.commit()
        except Exception as inner_e:
            logger.error("recipient_failure_record_failed", error=str(inner_e))


async def _finalize_job(db: AsyncSession, job: GenerationJob) -> None:
    """Determine final job status after all recipients processed."""
    job.completed_at = datetime.now(UTC)

    if job.failed_count == 0:
        job.status = JobStatus.COMPLETED
    elif job.success_count == 0:
        job.status = JobStatus.FAILED
    else:
        job.status = JobStatus.PARTIALLY_FAILED

    await db.commit()
    logger.info(
        "job_finalized",
        job_id=job.id,
        status=job.status,
        success=job.success_count,
        failed=job.failed_count,
    )


async def get_job_with_auth(
    db: AsyncSession,
    job_id: str,
    organization_id: str,
) -> GenerationJob:
    """Fetch a job, enforcing organization-level isolation."""
    result = await db.execute(
        select(GenerationJob).where(GenerationJob.id == job_id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise NotFoundError("GenerationJob", job_id)
    if job.organization_id != organization_id:
        raise AuthorizationError("You do not have access to this job")
    return job


async def retry_failed_recipients(
    db: AsyncSession,
    job_id: str,
    organization_id: str,
    user_id: str,
) -> dict:
    """Retry failed recipients for a job.

    Only retries recipients that have retry_count < MAX_RETRY_COUNT.
    Returns retry statistics.
    """
    job = await get_job_with_auth(db, job_id, organization_id)

    if job.status not in (JobStatus.PARTIALLY_FAILED, JobStatus.FAILED, JobStatus.COMPLETED):
        raise JobStateError(
            f"Cannot retry job in state '{job.status}'. "
            "Only jobs with failures can be retried."
        )

    # Find eligible failed recipients
    result = await db.execute(
        select(Recipient).where(
            Recipient.job_id == job_id,
            Recipient.status == RecipientStatus.FAILED,
            Recipient.retry_count < settings.MAX_RETRY_COUNT,
        )
    )
    eligible = result.scalars().all()

    if not eligible:
        return {
            "retried": 0,
            "message": "No eligible recipients to retry (all at max retry count or none failed)"
        }

    # Reset eligible recipients to PENDING
    for r in eligible:
        r.status = RecipientStatus.PENDING
        r.retry_count += 1
        r.error_code = None
        r.error_message = None

    job.status = JobStatus.QUEUED
    job.pending_count += len(eligible)
    job.failed_count = max(0, job.failed_count - len(eligible))

    await log_audit_event(
        db,
        action=AuditAction.JOB_RETRY,
        organization_id=organization_id,
        actor_id=user_id,
        resource_type="GenerationJob",
        resource_id=job_id,
        metadata={"retried_count": len(eligible)},
    )
    await db.commit()

    # Re-dispatch
    _dispatch_job(job_id)

    return {"retried": len(eligible), "message": f"Retrying {len(eligible)} failed recipients"}
