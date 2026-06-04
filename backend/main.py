import uvicorn
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.utils.logging import logger
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.db.session import engine
from app.models.base import init_db
from app.services.upload import UploadService

# Import routers
from app.api.v1.health import router as health_router
from app.api.v1.reconciliation import router as recon_router
from app.api.v1.uploads import router as uploads_router
from app.api.v1.preview import router as preview_router
from app.api.v1.ai import router as ai_router
from app.api.v1.investigation import router as investigation_router
from app.api.v1.ai_assistant import router as ai_assistant_router
from app.api.v1.reports import router as reports_router
from app.api.v1.auth import router as auth_router

# 1. Initialize FastAPI Application
limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Fintech-grade transaction matching and ledger comparison platform.",
    version="0.4.0",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# 2. Configure CORS middleware (cross-origin resource sharing policy)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2b. Observability middleware
from app.core.observability import RequestTimingMiddleware
app.add_middleware(RequestTimingMiddleware)

# 3. Standardized Global Exception Handling
@app.exception_handler(Exception)
def generic_exception_handler(request: Request, exc: Exception):
    """
    Catches unhandled server-side exceptions and returns a structured,
    non-leaky, professional JSON response.
    """
    logger.error(f"Unhandled server error on request path '{request.url.path}': {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "InternalServerError",
            "message": "An unexpected server error occurred. This audit trace has been logged."
        }
    )

# 4. Register API Routing Subgroups
app.include_router(health_router, prefix=f"{settings.API_V1_STR}/health", tags=["System Diagnostics"])
app.include_router(auth_router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(recon_router, prefix=f"{settings.API_V1_STR}/reconciliation", tags=["Reconciliation Workflows"])
app.include_router(uploads_router, prefix=f"{settings.API_V1_STR}/uploads", tags=["Upload Operations"])
app.include_router(preview_router, prefix=f"{settings.API_V1_STR}/preview", tags=["Data Previewers"])
app.include_router(ai_router, prefix=f"{settings.API_V1_STR}/ai", tags=["AI Intelligence"])
app.include_router(investigation_router, prefix=f"{settings.API_V1_STR}/investigation", tags=["Investigation & Analytics"])
app.include_router(ai_assistant_router, prefix=f"{settings.API_V1_STR}/ai-assistant", tags=["Conversational AI"])
app.include_router(reports_router, prefix=f"{settings.API_V1_STR}/reports", tags=["Reports"])

# 5. Startup Lifecycle Event: Auto-initialize storage structures and tables
@app.on_event("startup")
def startup_event():
    logger.info("Triggering platform startup diagnostics...")
    
    # Generate local folders (/uploads, /reports)
    UploadService.initialize_upload_folders()
    
    # Generate SQLite database file and base relational tables
    init_db(engine)
    
    logger.info("BANK AI Platform boot cycle finished successfully. Online.")

if __name__ == "__main__":
    # Start ASGI runner locally
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
