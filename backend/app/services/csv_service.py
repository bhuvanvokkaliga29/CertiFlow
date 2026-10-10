"""CSV parsing, validation, and safe export service."""

import csv
import io
import re

import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)

# Required CSV column names (case-insensitive after strip)
REQUIRED_COLUMNS = {"full_name"}
OPTIONAL_COLUMNS = {"email", "institution", "achievement"}
ALL_COLUMNS = REQUIRED_COLUMNS | OPTIONAL_COLUMNS

# Common alternative column names → canonical names
COLUMN_ALIASES: dict[str, str] = {
    "name": "full_name",
    "recipient_name": "full_name",
    "full name": "full_name",
    "participant": "full_name",
    "participant_name": "full_name",
    "email_address": "email",
    "e-mail": "email",
    "e_mail": "email",
    "mail": "email",
    "organization": "institution",
    "org": "institution",
    "college": "institution",
    "university": "institution",
    "award": "achievement",
    "award_name": "achievement",
    "prize": "achievement",
    "position": "achievement",
    "rank": "achievement",
}


def _sanitize_formula_injection(value: str) -> str:
    """Prevent CSV formula injection in exported data.

    Prefixes any cell starting with = + - @ with a single quote.
    """
    if value and value[0] in ("=", "+", "-", "@", "\t", "\r"):
        return "'" + value
    return value


def _normalize_header(header: str) -> str:
    """Normalize a CSV column header to lowercase, stripped."""
    return header.strip().lower().replace(" ", "_")


def detect_column_mapping(headers: list[str]) -> dict[str, str | None]:
    """Map raw CSV headers to canonical field names.

    Returns a dict: {canonical_field: raw_header_or_None}
    """
    normalized = {_normalize_header(h): h for h in headers}
    mapping: dict[str, str | None] = {}

    for canon in ALL_COLUMNS:
        # Exact match
        if canon in normalized:
            mapping[canon] = normalized[canon]
        # Alias match
        elif any(alias == canon or COLUMN_ALIASES.get(alias) == canon for alias in normalized):
            for alias, raw_h in normalized.items():
                if COLUMN_ALIASES.get(alias) == canon or alias == canon:
                    mapping[canon] = raw_h
                    break
        else:
            mapping[canon] = None

    return mapping


def parse_and_validate_csv(
    csv_bytes: bytes,
    max_rows: int | None = None,
) -> dict:
    """Parse and validate a CSV file for bulk certificate generation.

    Returns a dict with:
      - total_rows: int
      - valid_rows: int
      - invalid_rows: int
      - duplicate_rows: int
      - errors: list of {row, field, message}
      - valid_recipients: list of validated recipient dicts
      - preview: first 5 rows (raw)
      - column_mapping: detected mapping
    """
    max_rows = max_rows or settings.MAX_CSV_ROWS
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    if len(csv_bytes) > max_bytes:
        raise ValueError(
            f"CSV file exceeds maximum size of {settings.MAX_UPLOAD_SIZE_MB}MB"
        )

    try:
        text = csv_bytes.decode("utf-8-sig")  # Handle BOM
    except UnicodeDecodeError:
        try:
            text = csv_bytes.decode("latin-1")
        except Exception:
            raise ValueError("Could not decode CSV file. Please use UTF-8 encoding.")

    reader = csv.DictReader(io.StringIO(text))
    headers = reader.fieldnames or []

    if not headers:
        raise ValueError("CSV file has no headers")

    column_mapping = detect_column_mapping(list(headers))

    if column_mapping.get("full_name") is None:
        raise ValueError(
            "CSV must contain a 'full_name' column (or equivalent: 'name', 'recipient_name', etc.)"
        )

    rows = list(reader)
    if len(rows) > max_rows:
        raise ValueError(f"CSV exceeds maximum of {max_rows} rows")

    errors = []
    valid_recipients = []
    seen_emails: set = set()
    seen_names: set = set()
    duplicate_count = 0

    def get_val(row: dict, field: str) -> str:
        raw_col = column_mapping.get(field)
        if raw_col is None:
            return ""
        return (row.get(raw_col) or "").strip()

    preview = []
    for i, row in enumerate(rows[:5], start=2):
        preview.append({k: v.strip() if isinstance(v, str) else v for k, v in row.items()})

    for row_idx, row in enumerate(rows, start=2):
        row_errors = []
        is_blank = all(not (v or "").strip() for v in row.values())
        if is_blank:
            continue

        full_name = get_val(row, "full_name")
        email = get_val(row, "email")
        institution = get_val(row, "institution")
        achievement = get_val(row, "achievement")

        # Validate full_name
        if not full_name:
            row_errors.append({
                "row": row_idx, "field": "full_name", "message": "full_name is required"
            })
        elif len(full_name) > 300:
            row_errors.append({
                "row": row_idx, "field": "full_name",
                "message": f"full_name exceeds 300 characters (got {len(full_name)})"
            })

        # Validate email
        if email:
            email_norm = email.lower()
            pattern = r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$'
            if not re.match(pattern, email_norm):
                row_errors.append({
                    "row": row_idx, "field": "email",
                    "message": f"Invalid email format: {email}"
                })
            else:
                email = email_norm

        # Validate field lengths
        if len(institution) > 300:
            row_errors.append({
                "row": row_idx, "field": "institution",
                "message": "institution exceeds 300 characters"
            })
        if len(achievement) > 500:
            row_errors.append({
                "row": row_idx, "field": "achievement",
                "message": "achievement exceeds 500 characters"
            })

        if row_errors:
            errors.extend(row_errors)
            continue

        # Duplicate detection
        dedup_key = (full_name.lower(), (email or "").lower())
        if dedup_key in seen_names:
            errors.append({
                "row": row_idx, "field": "full_name",
                "message": f"Duplicate recipient: {full_name} ({email or 'no email'})"
            })
            duplicate_count += 1
            continue
        seen_names.add(dedup_key)

        valid_recipients.append({
            "full_name": full_name,
            "email": email or None,
            "institution": institution or None,
            "achievement": achievement or None,
        })

    total = len(rows)
    valid = len(valid_recipients)
    invalid = total - valid - duplicate_count

    return {
        "total_rows": total,
        "valid_rows": valid,
        "invalid_rows": max(0, invalid),
        "duplicate_rows": duplicate_count,
        "errors": errors,
        "valid_recipients": valid_recipients,
        "preview": preview,
        "column_mapping": {k: v for k, v in column_mapping.items()},
    }


def export_job_csv_report(
    recipients: list,
    certificates: dict,  # {recipient_id: certificate}
) -> bytes:
    """Export a CSV report of job results.

    Applies formula injection sanitization to all user-controlled fields.
    """
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Recipient Name", "Email", "Institution", "Achievement",
        "Status", "Certificate ID", "Error", "Issue Date"
    ])

    for r in recipients:
        cert = certificates.get(r.id)
        writer.writerow([
            _sanitize_formula_injection(r.full_name or ""),
            _sanitize_formula_injection(r.email or ""),
            _sanitize_formula_injection(r.institution or ""),
            _sanitize_formula_injection(r.achievement or ""),
            r.status,
            cert.public_id if cert else "",
            _sanitize_formula_injection(r.error_message or ""),
            cert.issued_at.date().isoformat() if cert else "",
        ])

    return output.getvalue().encode("utf-8-sig")  # UTF-8 with BOM for Excel
