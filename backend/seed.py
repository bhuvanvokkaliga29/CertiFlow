"""Database seed script for demo data and rapid testing."""

import asyncio
import os
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from app.core.database import AsyncSessionLocal, create_tables
from app.core.security import get_password_hash
from app.models.models import User, Organization, OrganizationMember, AccountStatus, UserRole
from app.services.job_service import create_generation_job
from app.schemas.jobs import CreateJobRequest, RecipientInput

DEMO_USER_EMAIL = "organizer@certiflow.local"
DEMO_USER_PASSWORD = "password123"
DEMO_ORG_NAME = "Acme Innovation Lab"


async def seed() -> None:
    print("Ensuring database tables exist...")
    await create_tables()

    async with AsyncSessionLocal() as db:
        # Check if user already exists
        result = await db.execute(select(User).where(User.email == DEMO_USER_EMAIL))
        existing_user = result.scalar_one_or_none()

        if existing_user:
            user = existing_user
            from app.services.job_service import get_organization_for_user
            org = await get_organization_for_user(db, user.id)
            print(f"Using existing demo user {DEMO_USER_EMAIL} and org {org.name}...")
        else:
            print(f"Creating demo user: {DEMO_USER_EMAIL}...")
            user = User(
                id=str(uuid.uuid4()),
                name="Alex Rivera",
                email=DEMO_USER_EMAIL,
                password_hash=get_password_hash(DEMO_USER_PASSWORD),
                role=UserRole.ORGANIZER,
                status=AccountStatus.ACTIVE,
            )
            db.add(user)

            print(f"Creating organization: {DEMO_ORG_NAME}...")
            org = Organization(
                id=str(uuid.uuid4()),
                name=DEMO_ORG_NAME,
                slug="acme-innovation-lab",
            )
            db.add(org)
            await db.flush()

            member = OrganizationMember(
                id=str(uuid.uuid4()),
                organization_id=org.id,
                user_id=user.id,
                role="owner",
            )
            db.add(member)
            await db.commit()

        print("Seeding sample certificate batch...")
        sample_request = CreateJobRequest(
            event_name="Global Hackathon 2026",
            issuer_name="Acme Innovation Foundation",
            issue_date="2026-10-10",
            achievement_description="Certificate of Outstanding Performance",
            signatory_name="Dr. Elena Vance",
            signatory_title="Head of Engineering",
            recipients=[
                RecipientInput(
                    full_name="Aarav Sharma",
                    email="aarav@example.com",
                    institution="Apex University",
                    achievement="First Place",
                ),
                RecipientInput(
                    full_name="Diya Rao",
                    email="diya@example.com",
                    institution="State Institute of Tech",
                    achievement="Best UI/UX Award",
                ),
                RecipientInput(
                    full_name="Kavya Menon",
                    email="kavya@example.com",
                    institution="National Engineering College",
                    achievement="Runner-Up",
                ),
            ],
        )

        job = await create_generation_job(db, sample_request, user.id, org.id)
        print(f"Created sample generation batch: {job.id}")
        print("\n=======================================================")
        print("Demo data seeded successfully!")
        print(f"Organizer Login: {DEMO_USER_EMAIL}")
        print(f"Password:        {DEMO_USER_PASSWORD}")
        print("=======================================================")


if __name__ == "__main__":
    asyncio.run(seed())
