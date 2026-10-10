"""Pydantic schemas for job creation and status."""

import re
from datetime import date
from typing import Any

from pydantic import BaseModel, ConfigDict, field_validator

# ---------------------------------------------------------------------------
# Recipient Input
# ---------------------------------------------------------------------------

class RecipientInput(BaseModel):
    full_name: str
    email: str | None = None
    institution: str | None = None
    achievement: str | None = None

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("full_name is required and cannot be blank")
        if len(v) > 300:
            raise ValueError("full_name must not exceed 300 characters")
        return v

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str | None) -> str | None:
        if v is None or v.strip() == "":
            return None
        v = v.strip().lower()
        # Simple RFC-ish email check
        pattern = r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, v):
            raise ValueError(f"Invalid email format: {v}")
        return v

    @field_validator("institution")
    @classmethod
    def validate_institution(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip()
        if len(v) > 300:
            raise ValueError("institution must not exceed 300 characters")
        return v or None

    @field_validator("achievement")
    @classmethod
    def validate_achievement(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip()
        if len(v) > 500:
            raise ValueError("achievement must not exceed 500 characters")
        return v or None


# ---------------------------------------------------------------------------
# Job Creation Request
# ---------------------------------------------------------------------------

class CreateJobRequest(BaseModel):
    event_name: str
    issuer_name: str
    issue_date: str  # ISO date YYYY-MM-DD
    achievement_description: str
    signatory_name: str
    signatory_title: str | None = None
    recipients: list[RecipientInput]

    @field_validator("event_name")
    @classmethod
    def validate_event_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("event_name is required")
        if len(v) > 500:
            raise ValueError("event_name must not exceed 500 characters")
        return v

    @field_validator("issuer_name")
    @classmethod
    def validate_issuer_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("issuer_name is required")
        if len(v) > 300:
            raise ValueError("issuer_name must not exceed 300 characters")
        return v

    @field_validator("issue_date")
    @classmethod
    def validate_issue_date(cls, v: str) -> str:
        try:
            date.fromisoformat(v)
        except ValueError:
            raise ValueError("issue_date must be a valid ISO date (YYYY-MM-DD)")
        return v

    @field_validator("achievement_description")
    @classmethod
    def validate_achievement_description(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("achievement_description is required")
        if len(v) > 500:
            raise ValueError("achievement_description must not exceed 500 characters")
        return v

    @field_validator("signatory_name")
    @classmethod
    def validate_signatory_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("signatory_name is required")
        if len(v) > 200:
            raise ValueError("signatory_name must not exceed 200 characters")
        return v

    @field_validator("recipients")
    @classmethod
    def validate_recipients(cls, v: list[RecipientInput]) -> list[RecipientInput]:
        from app.core.config import settings
        if not v:
            raise ValueError("At least one recipient is required")
        if len(v) > settings.MAX_RECIPIENTS_PER_JOB:
            raise ValueError(
                f"Maximum {settings.MAX_RECIPIENTS_PER_JOB} recipients per job allowed"
            )
        return v


# ---------------------------------------------------------------------------
# Job Response
# ---------------------------------------------------------------------------

class JobStatusResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    event_name: str
    issuer_name: str
    achievement_description: str
    issue_date: str
    signatory_name: str
    signatory_title: str | None
    status: str
    total_count: int
    pending_count: int
    processing_count: int
    success_count: int
    failed_count: int
    completion_percentage: float
    started_at: Any | None
    completed_at: Any | None
    created_at: Any
    updated_at: Any
    job_url: str | None = None


class CreateJobResponse(BaseModel):
    id: str
    job_id: str
    status: str
    total_recipients: int
    message: str
    job_url: str


# ---------------------------------------------------------------------------
# Recipient Response
# ---------------------------------------------------------------------------

class RecipientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    job_id: str
    full_name: str
    email: str | None
    institution: str | None
    achievement: str | None
    status: str
    retry_count: int
    error_code: str | None
    error_message: str | None
    started_at: Any | None
    completed_at: Any | None
    created_at: Any


class PaginatedRecipientsResponse(BaseModel):
    items: list[RecipientResponse]
    total: int
    page: int
    per_page: int
    pages: int


# ---------------------------------------------------------------------------
# Certificate Response
# ---------------------------------------------------------------------------

class CertificateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    public_id: str
    recipient_id: str
    recipient_name: str
    recipient_email: str | None = None
    event_name: str | None = None
    issuer_name: str | None = None
    achievement: str | None = None
    pdf_sha256: str | None = None
    is_valid: bool = True
    is_revoked: bool = False
    revocation_reason: str | None
    revoked_at: Any | None
    issued_at: Any
    download_url: str | None = None
    verification_url: str | None = None


class VerifyResponse(BaseModel):
    """Public-safe certificate verification result."""
    is_valid: bool
    is_revoked: bool
    certificate_id: str
    holder_name: str
    issuing_organization: str
    event_name: str
    achievement: str | None
    issue_date: str
    issued_at: Any
    revocation_reason: str | None = None
    revoked_at: Any | None = None


class RevokeRequest(BaseModel):
    reason: str

    @field_validator("reason")
    @classmethod
    def validate_reason(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Revocation reason is required")
        if len(v) > 1000:
            raise ValueError("Reason must not exceed 1000 characters")
        return v


# ---------------------------------------------------------------------------
# CSV Validation
# ---------------------------------------------------------------------------

class CSVValidationResult(BaseModel):
    total_rows: int
    valid_rows: int
    invalid_rows: int
    duplicate_rows: int
    errors: list[dict]
    preview: list[dict]
    column_mapping: dict
    valid_recipients: list[dict] = []
    session_token: str | None = None


# ---------------------------------------------------------------------------
# Audit Events
# ---------------------------------------------------------------------------

class AuditEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    action: str
    actor_email: str | None
    resource_type: str | None
    resource_id: str | None
    outcome: str
    metadata_json: str | None
    created_at: Any


class PaginatedAuditResponse(BaseModel):
    items: list[AuditEventResponse]
    total: int
    page: int
    per_page: int
    pages: int


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

class DashboardStatsResponse(BaseModel):
    total_jobs: int
    total_certificates: int
    successful_certificates: int
    failed_generations: int
    success_rate: float
    recent_jobs: list[JobStatusResponse]
