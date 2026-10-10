"""Audit events and dashboard stats API."""

import structlog
from fastapi import APIRouter, Query
from sqlalchemy import func, select

from app.api.dependencies import CurrentOrg, CurrentUser, DBSession
from app.models.models import AuditEvent, Certificate, GenerationJob, Recipient
from app.schemas.jobs import (
    AuditEventResponse,
    DashboardStatsResponse,
    JobStatusResponse,
    PaginatedAuditResponse,
)

logger = structlog.get_logger(__name__)
router = APIRouter(tags=["Audit & Dashboard"])


@router.get("/audit-events", response_model=PaginatedAuditResponse)
async def list_audit_events(
    current_user: CurrentUser,
    current_org: CurrentOrg,
    db: DBSession,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    action_filter: str = Query(None, alias="action"),
):
    """List audit events for the current organization."""
    query = select(AuditEvent).where(AuditEvent.organization_id == current_org.id)

    if action_filter:
        query = query.where(AuditEvent.action == action_filter)

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()

    offset = (page - 1) * per_page
    query = query.order_by(AuditEvent.created_at.desc()).limit(per_page).offset(offset)
    result = await db.execute(query)
    events = result.scalars().all()

    return PaginatedAuditResponse(
        items=[AuditEventResponse.model_validate(e) for e in events],
        total=total,
        page=page,
        per_page=per_page,
        pages=(total + per_page - 1) // per_page if total > 0 else 0,
    )


@router.get("/dashboard/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    current_user: CurrentUser,
    current_org: CurrentOrg,
    db: DBSession,
):
    """Get dashboard statistics for the current organization."""
    org_id = current_org.id

    # Total jobs
    total_jobs_result = await db.execute(
        select(func.count(GenerationJob.id)).where(GenerationJob.organization_id == org_id)
    )
    total_jobs = total_jobs_result.scalar_one()

    # Certificate counts
    cert_count_result = await db.execute(
        select(func.count(Certificate.id))
        .join(Recipient, Recipient.id == Certificate.recipient_id)
        .join(GenerationJob, GenerationJob.id == Recipient.job_id)
        .where(GenerationJob.organization_id == org_id)
    )
    total_certificates = cert_count_result.scalar_one()

    active_cert_result = await db.execute(
        select(func.count(Certificate.id))
        .join(Recipient, Recipient.id == Certificate.recipient_id)
        .join(GenerationJob, GenerationJob.id == Recipient.job_id)
        .where(GenerationJob.organization_id == org_id, Certificate.is_revoked == False)  # noqa
    )
    successful_certificates = active_cert_result.scalar_one()

    # Failed recipients
    failed_result = await db.execute(
        select(func.count(Recipient.id))
        .join(GenerationJob, GenerationJob.id == Recipient.job_id)
        .where(
            GenerationJob.organization_id == org_id,
            Recipient.status == "failed",
        )
    )
    failed_generations = failed_result.scalar_one()

    success_rate = (
        round(successful_certificates / total_certificates * 100, 1)
        if total_certificates > 0 else 0.0
    )

    # Recent jobs
    recent_result = await db.execute(
        select(GenerationJob)
        .where(GenerationJob.organization_id == org_id)
        .order_by(GenerationJob.created_at.desc())
        .limit(5)
    )
    recent_jobs = recent_result.scalars().all()

    return DashboardStatsResponse(
        total_jobs=total_jobs,
        total_certificates=total_certificates,
        successful_certificates=successful_certificates,
        failed_generations=failed_generations,
        success_rate=success_rate,
        recent_jobs=[
            JobStatusResponse(
                id=j.id,
                organization_id=j.organization_id,
                event_name=j.event_name,
                issuer_name=j.issuer_name,
                achievement_description=j.achievement_description,
                issue_date=j.issue_date,
                signatory_name=j.signatory_name,
                signatory_title=j.signatory_title,
                status=j.status,
                total_count=j.total_count,
                pending_count=j.pending_count,
                processing_count=j.processing_count,
                success_count=j.success_count,
                failed_count=j.failed_count,
                completion_percentage=j.completion_percentage,
                started_at=j.started_at,
                completed_at=j.completed_at,
                created_at=j.created_at,
                updated_at=j.updated_at,
            )
            for j in recent_jobs
        ],
    )
