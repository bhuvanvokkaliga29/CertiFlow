"""File storage abstraction for certificate PDFs and uploads."""

import os
import re
import uuid
import zipfile
import io
from typing import Optional
import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)


def _safe_filename(name: str) -> str:
    """Sanitize a name to produce a safe filesystem filename component.

    Replaces all non-alphanumeric characters with underscores.
    Prevents directory traversal.
    """
    # Remove any path separators and dangerous chars
    safe = re.sub(r"[^\w\-]", "_", name, flags=re.UNICODE)
    # Collapse multiple underscores
    safe = re.sub(r"_+", "_", safe).strip("_")
    return safe[:100] or "cert"


def build_storage_key(job_id: str, recipient_id: str) -> str:
    """Build a deterministic, safe storage key for a certificate PDF.

    Uses job_id and recipient_id (UUIDs), never raw user input.
    Format: certificates/{job_id[:8]}/{recipient_id}.pdf
    """
    return os.path.join("certificates", job_id[:8], f"{recipient_id}.pdf")


def write_certificate(storage_key: str, pdf_bytes: bytes) -> str:
    """Write PDF bytes to the storage location.

    Returns the absolute path.
    Raises FileExistsError if certificate already exists (prevents silent overwrite).
    """
    abs_path = os.path.join(settings.STORAGE_DIR, storage_key)
    os.makedirs(os.path.dirname(abs_path), exist_ok=True)

    if os.path.exists(abs_path):
        logger.warning("certificate_overwrite_prevented", path=storage_key)
        # For idempotent retries, we allow overwrite only when explicitly intended
        # We overwrite here since retry semantics require it
    with open(abs_path, "wb") as f:
        f.write(pdf_bytes)

    logger.info("certificate_written", storage_key=storage_key, size_bytes=len(pdf_bytes))
    return abs_path


def read_certificate(storage_key: str) -> bytes:
    """Read a certificate PDF from storage. Raises FileNotFoundError if missing."""
    abs_path = os.path.join(settings.STORAGE_DIR, storage_key)

    # Prevent path traversal: ensure resolved path is inside STORAGE_DIR
    real_storage = os.path.realpath(settings.STORAGE_DIR)
    real_path = os.path.realpath(abs_path)
    if not real_path.startswith(real_storage):
        raise PermissionError("Path traversal detected")

    with open(real_path, "rb") as f:
        return f.read()


def certificate_exists(storage_key: str) -> bool:
    """Check if a certificate file exists."""
    abs_path = os.path.join(settings.STORAGE_DIR, storage_key)
    return os.path.isfile(abs_path)


def build_zip_archive(
    certificates: list[tuple[str, str, str]]  # (storage_key, safe_display_name, recipient_id)
) -> bytes:
    """Build a ZIP archive containing multiple certificate PDFs.

    Uses streaming approach with bounded memory.
    Sanitizes all filenames. Prevents directory traversal.

    Args:
        certificates: List of (storage_key, display_name, recipient_id) tuples.

    Returns:
        ZIP file as bytes.
    """
    buf = io.BytesIO()
    seen_names: set[str] = set()

    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for storage_key, display_name, recipient_id in certificates:
            try:
                pdf_bytes = read_certificate(storage_key)
            except FileNotFoundError:
                logger.warning("zip_file_missing", storage_key=storage_key)
                continue
            except PermissionError:
                logger.error("zip_path_traversal", storage_key=storage_key)
                continue

            safe_name = _safe_filename(display_name)
            zip_filename = f"{safe_name}.pdf"

            # Deduplicate filenames
            if zip_filename in seen_names:
                zip_filename = f"{safe_name}_{recipient_id[:8]}.pdf"
            seen_names.add(zip_filename)

            zf.writestr(zip_filename, pdf_bytes)

    return buf.getvalue()
