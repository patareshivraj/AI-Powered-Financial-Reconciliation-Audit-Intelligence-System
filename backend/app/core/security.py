"""
Security middleware: rate limiting, upload validation, and AI prompt sanitization.
"""
import os
import re
import magic
from fastapi import UploadFile, HTTPException
from app.utils.logging import logger

# ── Upload Security ──────────────────────────────────────────────────────────

ALLOWED_MIME_TYPES = {
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/octet-stream",  # Some CSV files get this
}

MAX_UPLOAD_BYTES = 50 * 1024 * 1024  # 50 MB


def validate_upload(file: UploadFile) -> None:
    """Validates file MIME type, size, and prevents path traversal in filenames."""

    # 1. Path traversal prevention
    if file.filename:
        basename = os.path.basename(file.filename)
        if basename != file.filename or ".." in file.filename:
            raise HTTPException(status_code=400, detail="Invalid filename detected.")

    # 2. Extension check
    if file.filename:
        ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
        if ext not in ("csv", "xlsx", "xls"):
            raise HTTPException(status_code=400, detail=f"Unsupported file extension: .{ext}")

    # 3. MIME validation via magic bytes
    try:
        header = file.file.read(2048)
        file.file.seek(0)
        detected = magic.from_buffer(header, mime=True)
        if detected not in ALLOWED_MIME_TYPES:
            logger.warning(f"Upload rejected: MIME {detected} for file {file.filename}")
            raise HTTPException(status_code=400, detail=f"Invalid file type detected: {detected}")
    except HTTPException:
        raise
    except Exception:
        pass  # If magic fails, rely on extension check above

    # 4. Size check
    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)
    if size > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail=f"File exceeds {MAX_UPLOAD_BYTES // (1024*1024)}MB limit.")


# ── AI Prompt Security ───────────────────────────────────────────────────────

PROMPT_INJECTION_PATTERNS = [
    r"ignore\s+(previous|all|above)\s+instructions",
    r"you\s+are\s+now\s+",
    r"system\s*:\s*",
    r"<\|.*?\|>",
    r"```.*?override",
    r"pretend\s+you",
    r"act\s+as\s+if",
    r"do\s+not\s+follow",
    r"disregard",
]

MAX_AI_QUERY_LENGTH = 500


def sanitize_ai_query(query: str) -> str:
    """Validates and sanitizes user queries before sending to the LLM."""
    if not query or not query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    if len(query) > MAX_AI_QUERY_LENGTH:
        raise HTTPException(status_code=400, detail=f"Query exceeds {MAX_AI_QUERY_LENGTH} character limit.")

    lowered = query.lower()
    for pattern in PROMPT_INJECTION_PATTERNS:
        if re.search(pattern, lowered):
            logger.warning(f"Prompt injection attempt blocked: {query[:80]}")
            raise HTTPException(status_code=400, detail="Query contains disallowed patterns.")

    # Strip any HTML/XML tags
    cleaned = re.sub(r"<[^>]+>", "", query)
    return cleaned.strip()
