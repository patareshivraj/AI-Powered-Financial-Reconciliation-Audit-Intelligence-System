"""
Observability middleware: request timing, structured trace logging.
"""
import time
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from app.utils.logging import logger


class RequestTimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - start) * 1000

        # Log slow requests (>500ms) at WARNING level
        level = "WARNING" if elapsed_ms > 500 else "INFO"
        log_fn = logger.warning if elapsed_ms > 500 else logger.info

        log_fn(
            f"[TRACE] {request.method} {request.url.path} → {response.status_code} "
            f"({elapsed_ms:.1f}ms)"
        )

        response.headers["X-Response-Time-Ms"] = f"{elapsed_ms:.1f}"
        return response
