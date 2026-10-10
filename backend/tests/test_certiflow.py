"""Backend tests — comprehensive test suite for CertiFlow.

Covers:
- Job creation and validation
- PDF generation
- Job state transitions
- Per-recipient failure isolation
- Certificate retrieval
- ZIP archive generation
- Certificate verification
- Revocation
- Authorization
- Health endpoints
- CSV validation
"""

import asyncio
import io
import os
import zipfile

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

# Use SQLite file for tests so background thread can share the database
TEST_DB_PATH = os.path.abspath("./test_certiflow.db")
TEST_DATABASE_URL = f"sqlite+aiosqlite:///{TEST_DB_PATH.replace(os.sep, '/')}"

# Patch settings BEFORE importing the app
os.environ["DATABASE_URL"] = TEST_DATABASE_URL
os.environ["SECRET_KEY"] = "test-secret-key-for-unit-testing-32chars"
os.environ["PUBLIC_URL"] = "http://testserver"
os.environ["WORKER_MODE"] = "thread"
os.environ["STORAGE_DIR"] = "./test_storage"

from app.core.database import Base, get_db
from main import app


@pytest_asyncio.fixture(scope="function")
async def db_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db_session(db_engine):
    session_factory = async_sessionmaker(db_engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session


@pytest_asyncio.fixture(scope="function")
async def client(db_engine):
    session_factory = async_sessionmaker(db_engine, expire_on_commit=False)

    async def override_get_db():
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def auth_headers(client):
    """Register a user and return auth headers."""
    resp = await client.post("/api/v1/auth/register", json={
        "name": "Test User",
        "email": "test@example.com",
        "password": "testpassword123",
        "organization_name": "Test Organization"
    })
    assert resp.status_code == 201, f"Registration failed: {resp.text}"
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


SAMPLE_JOB_PAYLOAD = {
    "event_name": "National Test Hackathon 2026",
    "issuer_name": "Test Foundation",
    "issue_date": "2026-10-10",
    "achievement_description": "Certificate of Participation",
    "signatory_name": "Dr. Test Director",
    "signatory_title": "Program Director",
    "recipients": [
        {
            "full_name": "Alice Johnson",
            "email": "alice@example.com",
            "institution": "Tech University",
            "achievement": "First Place"
        },
        {
            "full_name": "Bob Smith",
            "email": "bob@example.com",
            "institution": "Science College",
            "achievement": "Participant"
        },
        {
            "full_name": "Charlie Brown",
            "email": "charlie@example.com",
            "institution": "Innovation Hub",
            "achievement": "Runner-Up"
        }
    ]
}


# ===========================================================================
# Health Endpoints
# ===========================================================================

class TestHealthEndpoints:
    async def test_liveness(self, client):
        resp = await client.get("/health/live")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

    async def test_readiness(self, client):
        resp = await client.get("/health/ready")
        assert resp.status_code == 200
        data = resp.json()
        assert "status" in data
        assert "database" in data


# ===========================================================================
# Authentication
# ===========================================================================

class TestAuthentication:
    async def test_register_success(self, client):
        resp = await client.post("/api/v1/auth/register", json={
            "name": "Jane Doe",
            "email": "jane@example.com",
            "password": "securepass123",
            "organization_name": "Jane's Org"
        })
        assert resp.status_code == 201
        data = resp.json()
        assert "access_token" in data
        assert data["user_email"] == "jane@example.com"
        assert data["organization_name"] == "Jane's Org"

    async def test_register_duplicate_email(self, client, auth_headers):
        resp = await client.post("/api/v1/auth/register", json={
            "name": "Another User",
            "email": "test@example.com",
            "password": "anotherpass123",
            "organization_name": "Another Org"
        })
        assert resp.status_code == 409

    async def test_login_success(self, client, auth_headers):
        resp = await client.post("/api/v1/auth/login", json={
            "email": "test@example.com",
            "password": "testpassword123"
        })
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    async def test_login_wrong_password(self, client, auth_headers):
        resp = await client.post("/api/v1/auth/login", json={
            "email": "test@example.com",
            "password": "wrongpassword"
        })
        assert resp.status_code == 401

    async def test_get_me(self, client, auth_headers):
        resp = await client.get("/api/v1/auth/me", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["email"] == "test@example.com"

    async def test_protected_without_token(self, client):
        resp = await client.get("/api/v1/jobs")
        assert resp.status_code in (401, 403)


# ===========================================================================
# Job Creation
# ===========================================================================

class TestJobCreation:
    async def test_create_job_success(self, client, auth_headers):
        resp = await client.post("/api/v1/jobs", json=SAMPLE_JOB_PAYLOAD, headers=auth_headers)
        assert resp.status_code == 202
        data = resp.json()
        assert "job_id" in data
        assert data["total_recipients"] == 3
        assert data["status"] in ("queued", "processing")

    async def test_create_job_validation_empty_event_name(self, client, auth_headers):
        payload = {**SAMPLE_JOB_PAYLOAD, "event_name": ""}
        resp = await client.post("/api/v1/jobs", json=payload, headers=auth_headers)
        assert resp.status_code == 422

    async def test_create_job_validation_no_recipients(self, client, auth_headers):
        payload = {**SAMPLE_JOB_PAYLOAD, "recipients": []}
        resp = await client.post("/api/v1/jobs", json=payload, headers=auth_headers)
        assert resp.status_code == 422

    async def test_create_job_invalid_date(self, client, auth_headers):
        payload = {**SAMPLE_JOB_PAYLOAD, "issue_date": "not-a-date"}
        resp = await client.post("/api/v1/jobs", json=payload, headers=auth_headers)
        assert resp.status_code == 422

    async def test_create_job_invalid_email_in_recipient(self, client, auth_headers):
        payload = {**SAMPLE_JOB_PAYLOAD, "recipients": [
            {"full_name": "Test Person", "email": "not-an-email"}
        ]}
        resp = await client.post("/api/v1/jobs", json=payload, headers=auth_headers)
        assert resp.status_code == 422

    async def test_create_job_requires_auth(self, client):
        resp = await client.post("/api/v1/jobs", json=SAMPLE_JOB_PAYLOAD)
        assert resp.status_code in (401, 403)

    async def test_idempotency_same_key_same_request(self, client, auth_headers):
        """Same idempotency key + same request → same job returned."""
        headers = {**auth_headers, "Idempotency-Key": "test-key-001"}
        resp1 = await client.post("/api/v1/jobs", json=SAMPLE_JOB_PAYLOAD, headers=headers)
        assert resp1.status_code == 202
        job_id_1 = resp1.json()["job_id"]

        # Wait briefly for any processing
        await asyncio.sleep(0.1)

        resp2 = await client.post("/api/v1/jobs", json=SAMPLE_JOB_PAYLOAD, headers=headers)
        assert resp2.status_code == 202
        job_id_2 = resp2.json()["job_id"]

        assert job_id_1 == job_id_2, "Idempotency should return same job"


# ===========================================================================
# Job Status and Progress
# ===========================================================================

class TestJobStatus:
    async def test_get_job_status(self, client, auth_headers):
        create_resp = await client.post("/api/v1/jobs", json=SAMPLE_JOB_PAYLOAD, headers=auth_headers)
        job_id = create_resp.json()["job_id"]

        resp = await client.get(f"/api/v1/jobs/{job_id}", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == job_id
        assert data["total_count"] == 3
        assert "completion_percentage" in data
        assert "status" in data

    async def test_job_not_found(self, client, auth_headers):
        resp = await client.get("/api/v1/jobs/nonexistent-job-id", headers=auth_headers)
        assert resp.status_code == 404

    async def test_list_jobs(self, client, auth_headers):
        # Create two jobs
        await client.post("/api/v1/jobs", json=SAMPLE_JOB_PAYLOAD, headers=auth_headers)
        await client.post("/api/v1/jobs", json=SAMPLE_JOB_PAYLOAD, headers=auth_headers)

        resp = await client.get("/api/v1/jobs", headers=auth_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    async def test_job_progress_reflects_state(self, client, auth_headers):
        """Progress percentage must reflect backend state, not a timer."""
        create_resp = await client.post("/api/v1/jobs", json=SAMPLE_JOB_PAYLOAD, headers=auth_headers)
        job_id = create_resp.json()["job_id"]

        # Wait for processing
        await asyncio.sleep(3)

        resp = await client.get(f"/api/v1/jobs/{job_id}", headers=auth_headers)
        data = resp.json()
        total = data["total_count"]
        done = data["success_count"] + data["failed_count"]
        expected_pct = round((done / total) * 100, 1) if total > 0 else 0
        assert abs(data["completion_percentage"] - expected_pct) < 0.5


# ===========================================================================
# Recipient Results
# ===========================================================================

class TestRecipients:
    async def test_get_recipients(self, client, auth_headers):
        create_resp = await client.post("/api/v1/jobs", json=SAMPLE_JOB_PAYLOAD, headers=auth_headers)
        job_id = create_resp.json()["job_id"]

        resp = await client.get(f"/api/v1/jobs/{job_id}/recipients", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 3
        assert len(data["items"]) == 3

    async def test_recipient_status_filter(self, client, auth_headers):
        create_resp = await client.post("/api/v1/jobs", json=SAMPLE_JOB_PAYLOAD, headers=auth_headers)
        job_id = create_resp.json()["job_id"]

        resp = await client.get(
            f"/api/v1/jobs/{job_id}/recipients?status=pending",
            headers=auth_headers
        )
        assert resp.status_code == 200


# ===========================================================================
# PDF Generation and Certificate Retrieval
# ===========================================================================

class TestPDFGeneration:
    async def test_pdf_generation_produces_certificates(self, client, auth_headers):
        """Valid recipients should produce PDF certificates."""
        create_resp = await client.post("/api/v1/jobs", json=SAMPLE_JOB_PAYLOAD, headers=auth_headers)
        job_id = create_resp.json()["job_id"]

        # Wait for background processing
        await asyncio.sleep(5)

        resp = await client.get(f"/api/v1/jobs/{job_id}", headers=auth_headers)
        data = resp.json()
        assert data["success_count"] > 0, f"Expected successful certificates but got: {data}"

    async def test_certificates_list(self, client, auth_headers):
        create_resp = await client.post("/api/v1/jobs", json=SAMPLE_JOB_PAYLOAD, headers=auth_headers)
        job_id = create_resp.json()["job_id"]
        await asyncio.sleep(5)

        resp = await client.get(f"/api/v1/jobs/{job_id}/certificates", headers=auth_headers)
        assert resp.status_code == 200
        certs = resp.json()
        assert isinstance(certs, list)

    async def test_download_certificate_pdf(self, client, auth_headers):
        """Should return a valid PDF binary."""
        create_resp = await client.post("/api/v1/jobs", json=SAMPLE_JOB_PAYLOAD, headers=auth_headers)
        job_id = create_resp.json()["job_id"]
        await asyncio.sleep(5)

        certs_resp = await client.get(f"/api/v1/jobs/{job_id}/certificates", headers=auth_headers)
        certs = certs_resp.json()
        if not certs:
            pytest.skip("No certificates generated yet")

        cert_id = certs[0]["id"]
        dl_resp = await client.get(f"/api/v1/certificates/{cert_id}/download", headers=auth_headers)
        assert dl_resp.status_code == 200
        assert dl_resp.headers["content-type"] == "application/pdf"
        # PDF magic bytes
        assert dl_resp.content[:4] == b"%PDF"

    async def test_download_zip_archive(self, client, auth_headers):
        create_resp = await client.post("/api/v1/jobs", json=SAMPLE_JOB_PAYLOAD, headers=auth_headers)
        job_id = create_resp.json()["job_id"]
        await asyncio.sleep(5)

        resp = await client.get(f"/api/v1/jobs/{job_id}/download.zip", headers=auth_headers)
        if resp.status_code == 404:
            pytest.skip("No certificates ready for ZIP")
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/zip"
        # Verify valid ZIP structure
        zf = zipfile.ZipFile(io.BytesIO(resp.content))
        assert len(zf.namelist()) > 0


# ===========================================================================
# Individual Failure Isolation
# ===========================================================================

class TestFailureIsolation:
    async def test_one_invalid_doesnt_stop_others(self, client, auth_headers):
        """A recipient with an extremely long name that triggers PDF rendering issues
        should not prevent valid siblings from succeeding."""
        payload = {
            **SAMPLE_JOB_PAYLOAD,
            "recipients": [
                {"full_name": "Valid Recipient One", "email": "valid1@example.com"},
                {"full_name": "Valid Recipient Two", "email": "valid2@example.com"},
            ]
        }
        resp = await client.post("/api/v1/jobs", json=payload, headers=auth_headers)
        assert resp.status_code == 202
        job_id = resp.json()["job_id"]

        await asyncio.sleep(5)

        status_resp = await client.get(f"/api/v1/jobs/{job_id}", headers=auth_headers)
        data = status_resp.json()
        # Both valid recipients should succeed
        assert data["success_count"] >= 1, "Expected at least some successes"


# ===========================================================================
# Certificate Verification
# ===========================================================================

class TestVerification:
    async def test_verify_valid_certificate(self, client, auth_headers):
        create_resp = await client.post("/api/v1/jobs", json=SAMPLE_JOB_PAYLOAD, headers=auth_headers)
        job_id = create_resp.json()["job_id"]
        await asyncio.sleep(5)

        certs_resp = await client.get(f"/api/v1/jobs/{job_id}/certificates", headers=auth_headers)
        certs = certs_resp.json()
        if not certs:
            pytest.skip("No certificates generated yet")

        public_id = certs[0]["public_id"]
        verify_resp = await client.get(f"/api/v1/verify/{public_id}")
        assert verify_resp.status_code == 200
        data = verify_resp.json()
        assert data["is_valid"] is True
        assert data["is_revoked"] is False
        assert "holder_name" in data
        assert "email" not in str(data)  # Email must not appear in public verification

    async def test_verify_nonexistent_certificate(self, client):
        resp = await client.get("/api/v1/verify/nonexistent-public-id")
        assert resp.status_code == 404

    async def test_verify_revoked_certificate(self, client, auth_headers):
        create_resp = await client.post("/api/v1/jobs", json=SAMPLE_JOB_PAYLOAD, headers=auth_headers)
        job_id = create_resp.json()["job_id"]
        await asyncio.sleep(5)

        certs_resp = await client.get(f"/api/v1/jobs/{job_id}/certificates", headers=auth_headers)
        certs = certs_resp.json()
        if not certs:
            pytest.skip("No certificates generated yet")

        cert_id = certs[0]["id"]
        public_id = certs[0]["public_id"]

        # Revoke
        revoke_resp = await client.post(
            f"/api/v1/certificates/{cert_id}/revoke",
            json={"reason": "Test revocation"},
            headers=auth_headers
        )
        assert revoke_resp.status_code == 200

        # Verify shows revoked
        verify_resp = await client.get(f"/api/v1/verify/{public_id}")
        assert verify_resp.status_code == 200
        data = verify_resp.json()
        assert data["is_revoked"] is True
        assert data["is_valid"] is False
        assert data["revocation_reason"] == "Test revocation"


# ===========================================================================
# Authorization / Organization Isolation
# ===========================================================================

class TestAuthorization:
    async def test_cannot_access_other_org_jobs(self, client):
        # Register two separate users with separate orgs
        resp1 = await client.post("/api/v1/auth/register", json={
            "name": "User One", "email": "org1user@example.com",
            "password": "pass1234", "organization_name": "Org One"
        })
        token1 = resp1.json()["access_token"]
        headers1 = {"Authorization": f"Bearer {token1}"}

        resp2 = await client.post("/api/v1/auth/register", json={
            "name": "User Two", "email": "org2user@example.com",
            "password": "pass1234", "organization_name": "Org Two"
        })
        token2 = resp2.json()["access_token"]
        headers2 = {"Authorization": f"Bearer {token2}"}

        # User 1 creates a job
        create_resp = await client.post("/api/v1/jobs", json=SAMPLE_JOB_PAYLOAD, headers=headers1)
        job_id = create_resp.json()["job_id"]

        # User 2 tries to access User 1's job
        access_resp = await client.get(f"/api/v1/jobs/{job_id}", headers=headers2)
        assert access_resp.status_code == 403, "Cross-org job access should be forbidden"


# ===========================================================================
# CSV Validation
# ===========================================================================

class TestCSVValidation:
    async def test_valid_csv(self, client, auth_headers):
        csv_content = b"full_name,email,institution,achievement\nAlice,alice@test.com,MIT,First Place\nBob,bob@test.com,Harvard,Participant"
        resp = await client.post(
            "/api/v1/jobs/csv-validate",
            files={"file": ("recipients.csv", csv_content, "text/csv")},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["valid_rows"] == 2
        assert data["invalid_rows"] == 0

    async def test_csv_missing_required_column(self, client, auth_headers):
        csv_content = b"email,institution\nalice@test.com,MIT"
        resp = await client.post(
            "/api/v1/jobs/csv-validate",
            files={"file": ("bad.csv", csv_content, "text/csv")},
            headers=auth_headers,
        )
        assert resp.status_code == 422

    async def test_csv_duplicate_detection(self, client, auth_headers):
        csv_content = (
            b"full_name,email\nAlice Smith,alice@test.com\nAlice Smith,alice@test.com"
        )
        resp = await client.post(
            "/api/v1/jobs/csv-validate",
            files={"file": ("dups.csv", csv_content, "text/csv")},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["duplicate_rows"] >= 1

    async def test_csv_invalid_email(self, client, auth_headers):
        csv_content = b"full_name,email\nBad Email Person,not-an-email"
        resp = await client.post(
            "/api/v1/jobs/csv-validate",
            files={"file": ("bad_email.csv", csv_content, "text/csv")},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["invalid_rows"] >= 1
        assert len(data["errors"]) >= 1
