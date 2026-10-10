"""Authentication API endpoints."""

import re
import uuid

import structlog
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.dependencies import CurrentUser, DBSession
from app.core.config import settings
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.models import AccountStatus, AuditAction, Organization, OrganizationMember, User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.services.audit_service import log_audit_event

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])


def _slugify(name: str) -> str:
    """Create a URL-safe slug from an organization name."""
    slug = re.sub(r"[^\w\s-]", "", name.lower()).strip()
    slug = re.sub(r"[\s_-]+", "-", slug)
    return slug[:200]


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest, db: DBSession):
    """Register a new user and create their organization."""
    # Check email uniqueness
    existing = await db.execute(select(User).where(User.email == request.email.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists"
        )

    # Create user
    user = User(
        id=str(uuid.uuid4()),
        name=request.name.strip(),
        email=request.email.lower(),
        password_hash=get_password_hash(request.password),
    )
    db.add(user)
    await db.flush()

    # Create organization with unique slug
    base_slug = _slugify(request.organization_name)
    slug = base_slug
    suffix = 1
    while True:
        existing_org = await db.execute(select(Organization).where(Organization.slug == slug))
        if not existing_org.scalar_one_or_none():
            break
        slug = f"{base_slug}-{suffix}"
        suffix += 1

    org = Organization(
        id=str(uuid.uuid4()),
        name=request.organization_name.strip(),
        slug=slug,
    )
    db.add(org)
    await db.flush()

    # Create membership
    member = OrganizationMember(
        organization_id=org.id,
        user_id=user.id,
        role="owner",
    )
    db.add(member)

    # Audit event
    await log_audit_event(
        db,
        action=AuditAction.USER_REGISTERED,
        organization_id=org.id,
        actor_id=user.id,
        actor_email=user.email,
        resource_type="User",
        resource_id=user.id,
    )
    await log_audit_event(
        db,
        action=AuditAction.ORG_CREATED,
        organization_id=org.id,
        actor_id=user.id,
        actor_email=user.email,
        resource_type="Organization",
        resource_id=org.id,
        metadata={"org_name": org.name},
    )
    await db.commit()

    token = create_access_token({"sub": user.id, "org_id": org.id})

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user_id=user.id,
        user_name=user.name,
        user_email=user.email,
        organization_id=org.id,
        organization_name=org.name,
    )


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: DBSession):
    """Authenticate a user and return a JWT token."""
    result = await db.execute(select(User).where(User.email == request.email.lower()))
    user = result.scalar_one_or_none()

    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if user.status != AccountStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended"
        )

    # Get organization
    org_result = await db.execute(
        select(Organization)
        .join(OrganizationMember, OrganizationMember.organization_id == Organization.id)
        .where(OrganizationMember.user_id == user.id)
        .limit(1)
    )
    org = org_result.scalar_one_or_none()

    await log_audit_event(
        db,
        action=AuditAction.USER_LOGIN,
        organization_id=org.id if org else None,
        actor_id=user.id,
        actor_email=user.email,
        resource_type="User",
        resource_id=user.id,
    )
    await db.commit()

    token = create_access_token({"sub": user.id, "org_id": org.id if org else ""})

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user_id=user.id,
        user_name=user.name,
        user_email=user.email,
        organization_id=org.id if org else "",
        organization_name=org.name if org else "",
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: CurrentUser):
    """Get the current authenticated user's profile."""
    return UserResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role,
        status=current_user.status,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(current_user: CurrentUser, db: DBSession):
    """Log out the current user (audit event only — tokens are stateless JWTs)."""
    from app.models.models import Organization, OrganizationMember
    org_result = await db.execute(
        select(Organization)
        .join(OrganizationMember, OrganizationMember.organization_id == Organization.id)
        .where(OrganizationMember.user_id == current_user.id)
        .limit(1)
    )
    org = org_result.scalar_one_or_none()

    await log_audit_event(
        db,
        action=AuditAction.USER_LOGOUT,
        organization_id=org.id if org else None,
        actor_id=current_user.id,
        actor_email=current_user.email,
        resource_type="User",
        resource_id=current_user.id,
    )
    await db.commit()
