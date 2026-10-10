"""Premium certificate PDF rendering service using ReportLab.

Template: A4 Landscape, premium institutional style.
Palette: Deep navy text, warm white background, gold accents.
"""

import hashlib
import io

import qrcode
import structlog
from PIL import Image
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas as pdf_canvas

logger = structlog.get_logger(__name__)

# A4 landscape dimensions
PAGE_WIDTH, PAGE_HEIGHT = landscape(A4)  # 297mm x 210mm

# Color palette
NAVY = colors.HexColor("#0D1B2A")
GOLD = colors.HexColor("#C9A84C")
GOLD_LIGHT = colors.HexColor("#E8D5A3")
WHITE = colors.HexColor("#FAFAF8")
CREAM = colors.HexColor("#F5F2EA")
LIGHT_GRAY = colors.HexColor("#D8D8D8")
DARK_GRAY = colors.HexColor("#5A5A5A")
BORDER_GOLD = colors.HexColor("#B8952C")


def _draw_border(c: pdf_canvas.Canvas) -> None:
    """Draw the outer and inner decorative border."""
    margin = 12 * mm

    # Outer border (thick gold)
    c.setStrokeColor(GOLD)
    c.setLineWidth(3)
    c.rect(margin, margin, PAGE_WIDTH - 2 * margin, PAGE_HEIGHT - 2 * margin)

    # Inner border (thin navy)
    inner_m = margin + 4 * mm
    c.setStrokeColor(NAVY)
    c.setLineWidth(0.75)
    c.rect(inner_m, inner_m, PAGE_WIDTH - 2 * inner_m, PAGE_HEIGHT - 2 * inner_m)

    # Corner ornaments (small gold squares at each corner)
    corner_size = 4 * mm
    corners = [
        (margin, margin),
        (PAGE_WIDTH - margin - corner_size, margin),
        (margin, PAGE_HEIGHT - margin - corner_size),
        (PAGE_WIDTH - margin - corner_size, PAGE_HEIGHT - margin - corner_size),
    ]
    c.setFillColor(GOLD)
    c.setStrokeColor(GOLD)
    for cx, cy in corners:
        c.rect(cx, cy, corner_size, corner_size, fill=1, stroke=0)


def _draw_header_band(c: pdf_canvas.Canvas) -> None:
    """Draw the top navy header band."""
    band_height = 22 * mm
    c.setFillColor(NAVY)
    c.rect(0, PAGE_HEIGHT - band_height, PAGE_WIDTH, band_height, fill=1, stroke=0)


def _draw_footer_band(c: pdf_canvas.Canvas) -> None:
    """Draw the bottom gold accent strip."""
    strip_height = 3 * mm
    c.setFillColor(GOLD)
    c.rect(0, 0, PAGE_WIDTH, strip_height, fill=1, stroke=0)


def _center_text(c: pdf_canvas.Canvas, y: float, text: str, font: str, size: float,
                 color=NAVY, max_width: float | None = None) -> None:
    """Draw text centered on the page, wrapping if needed."""
    c.setFont(font, size)
    c.setFillColor(color)
    text_width = c.stringWidth(text, font, size)
    if max_width and text_width > max_width:
        # Scale down font size to fit
        scale = max_width / text_width
        size = max(8, int(size * scale))
        c.setFont(font, size)
        text_width = c.stringWidth(text, font, size)
    x = (PAGE_WIDTH - text_width) / 2
    c.drawString(x, y, text)


def _draw_gold_separator(c: pdf_canvas.Canvas, y: float, width: float = 80 * mm) -> None:
    """Draw a centered gold horizontal line."""
    x = (PAGE_WIDTH - width) / 2
    c.setStrokeColor(GOLD)
    c.setLineWidth(1)
    c.line(x, y, x + width, y)


def _generate_qr_image(url: str) -> Image.Image:
    """Generate a QR code PIL image for the given URL."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=4,
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)
    return qr.make_image(fill_color="#0D1B2A", back_color="#FAFAF8").convert("RGB")


def render_certificate_pdf(
    recipient_name: str,
    event_name: str,
    issuer_name: str,
    achievement_description: str,
    achievement: str | None,
    issue_date: str,
    signatory_name: str,
    signatory_title: str | None,
    certificate_id: str,
    verification_url: str,
    recipient_institution: str | None = None,
) -> bytes:
    """Render a premium A4 landscape certificate PDF and return bytes.

    All text fields are sanitized to prevent control characters.
    Long names are scaled to fit within the layout.
    """
    # Sanitize text inputs
    def sanitize(s: str | None, fallback: str = "") -> str:
        if not s:
            return fallback
        # Remove control chars except newline
        return "".join(ch for ch in s if ord(ch) >= 32 or ch == "\n").strip()

    recipient_name = sanitize(recipient_name, "Unknown Recipient")
    event_name = sanitize(event_name, "Event")
    issuer_name = sanitize(issuer_name, "Issuing Organization")
    achievement_description = sanitize(achievement_description, "Certificate of Achievement")
    achievement = sanitize(achievement) or None
    signatory_name = sanitize(signatory_name, "Signatory")
    signatory_title = sanitize(signatory_title) or "Program Director"
    recipient_institution = sanitize(recipient_institution) or None

    buf = io.BytesIO()
    c = pdf_canvas.Canvas(buf, pagesize=landscape(A4))
    c.setTitle(f"Certificate - {recipient_name}")
    c.setAuthor(issuer_name)
    c.setSubject(achievement_description)

    # Background
    c.setFillColor(WHITE)
    c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)

    # Structural elements
    _draw_header_band(c)
    _draw_footer_band(c)
    _draw_border(c)

    # --- Header area (inside navy band) ---
    header_y = PAGE_HEIGHT - 18 * mm
    _center_text(c, header_y, issuer_name.upper(), "Helvetica-Bold", 11, color=WHITE,
                 max_width=200 * mm)

    # --- Certificate title ---
    title_y = PAGE_HEIGHT - 48 * mm
    _center_text(c, title_y, achievement_description.upper(), "Helvetica-Bold", 22, color=GOLD,
                 max_width=240 * mm)

    # Gold separator below title
    _draw_gold_separator(c, title_y - 5 * mm, 60 * mm)

    # --- "This is to certify that" ---
    certify_y = title_y - 18 * mm
    _center_text(c, certify_y, "This is to certify that", "Helvetica", 12, color=DARK_GRAY)

    # --- Recipient Name (largest text on page) ---
    name_y = certify_y - 22 * mm
    # Use a large size, scale if name is long
    _center_text(c, name_y, recipient_name, "Helvetica-Bold", 36, color=NAVY,
                 max_width=220 * mm)

    # Thin underline below name
    name_width = min(c.stringWidth(recipient_name, "Helvetica-Bold", 36), 220 * mm)
    name_x = (PAGE_WIDTH - name_width) / 2
    c.setStrokeColor(GOLD)
    c.setLineWidth(0.75)
    c.line(name_x, name_y - 3 * mm, name_x + name_width, name_y - 3 * mm)

    # Institution (optional)
    inst_y = name_y - 11 * mm
    if recipient_institution:
        _center_text(c, inst_y, f"of  {recipient_institution}", "Helvetica-Oblique", 11,
                     color=DARK_GRAY, max_width=200 * mm)

    # --- Achievement / event ---
    achievement_y = inst_y - 14 * mm if recipient_institution else name_y - 20 * mm
    award_text = achievement if achievement else "Certificate of Participation"
    _center_text(c, achievement_y, f"for  {award_text}", "Helvetica", 13, color=NAVY,
                 max_width=200 * mm)

    event_y = achievement_y - 10 * mm
    _center_text(c, event_y, f"at  {event_name}", "Helvetica-Bold", 13, color=NAVY,
                 max_width=220 * mm)

    # Gold separator above footer
    sep_y = 50 * mm
    _draw_gold_separator(c, sep_y, 200 * mm)

    # --- Bottom section ---
    # Left: Issue date
    c.setFont("Helvetica", 9)
    c.setFillColor(DARK_GRAY)
    c.drawString(25 * mm, 40 * mm, "Issue Date")
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(NAVY)
    c.drawString(25 * mm, 33 * mm, issue_date)

    # Center: Certificate ID
    cert_id_text = f"Certificate ID: {certificate_id[:8].upper()}...{certificate_id[-4:].upper()}"
    _center_text(c, 40 * mm, cert_id_text, "Helvetica", 8, color=DARK_GRAY)
    _center_text(c, 34 * mm, "Scan QR code to verify authenticity", "Helvetica-Oblique", 8,
                 color=DARK_GRAY)

    # Right: Signatory
    sig_x = PAGE_WIDTH - 80 * mm
    c.setFont("Helvetica", 9)
    c.setFillColor(DARK_GRAY)
    c.drawString(sig_x, 44 * mm, signatory_name)
    c.setFont("Helvetica-Oblique", 8)
    c.drawString(sig_x, 38 * mm, signatory_title or "Program Director")
    c.setStrokeColor(GOLD)
    c.setLineWidth(0.75)
    c.line(sig_x, 46 * mm, sig_x + 60 * mm, 46 * mm)

    # --- QR Code ---
    qr_img = _generate_qr_image(verification_url)
    qr_buf = io.BytesIO()
    qr_img.save(qr_buf, format="PNG")
    qr_buf.seek(0)
    qr_size = 22 * mm
    qr_x = (PAGE_WIDTH - qr_size) / 2
    qr_y = 12 * mm
    c.drawImage(ImageReader(qr_buf), qr_x, qr_y, width=qr_size, height=qr_size)

    c.save()
    return buf.getvalue()


def compute_sha256(data: bytes) -> str:
    """Compute SHA-256 hex digest of given bytes."""
    return hashlib.sha256(data).hexdigest()
