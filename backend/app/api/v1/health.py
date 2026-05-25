from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db
from app.core.config import settings
from app.utils.logging import logger
import os

router = APIRouter()

@router.get("", status_code=status.HTTP_200_OK)
def check_health(db: Session = Depends(get_db)):
    """
    Systems diagnostic endpoint. 
    Checks database connection responsiveness, directory write access, and operational variables.
    """
    diagnostics = {
        "status": "operational",
        "version": "0.1.0-alpha",
        "database": "unknown",
        "storage": {
            "uploads_writable": False,
            "reports_writable": False
        }
    }
    
    # 1. Probe SQLite responsiveness
    try:
        db.execute(text("SELECT 1"))
        diagnostics["database"] = "responsive"
    except Exception as e:
        logger.error(f"Database connection probe failed: {e}")
        diagnostics["database"] = f"unresponsive: {str(e)}"
        diagnostics["status"] = "degraded"
        
    # 2. Probe local storage write access
    for folder_key, folder_path in [("uploads_writable", settings.UPLOAD_DIR), ("reports_writable", settings.REPORTS_DIR)]:
        try:
            if not os.path.exists(folder_path):
                os.makedirs(folder_path, exist_ok=True)
            # Create a tiny test file and immediately delete it
            test_file = os.path.join(folder_path, ".write_probe")
            with open(test_file, "w") as f:
                f.write("probe")
            os.remove(test_file)
            diagnostics["storage"][folder_key] = True
        except Exception as e:
            logger.error(f"Storage path {folder_path} read/write probe failed: {e}")
            diagnostics["status"] = "degraded"

    return diagnostics
