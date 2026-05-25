from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.reporting_service import ReportingService
from app.utils.logging import logger
import io

router = APIRouter(tags=["Reports"])

@router.get("/investigation/{session_id}")
async def download_investigation_report(
    session_id: str,
    format: str = Query("pdf", pattern="^(csv|xlsx|pdf)$"),
    db: Session = Depends(get_db)
):
    """Generate and download an investigation report in CSV, XLSX, or PDF format."""
    logger.info(f"API: Generating {format.upper()} investigation report for session {session_id}")
    try:
        if format == "csv":
            content = ReportingService.generate_csv(db, session_id)
            return StreamingResponse(
                iter([content]),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename=investigation_{session_id}.csv"}
            )
        elif format == "xlsx":
            content = ReportingService.generate_xlsx(db, session_id)
            return StreamingResponse(
                io.BytesIO(content),
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": f"attachment; filename=investigation_{session_id}.xlsx"}
            )
        else:
            content = ReportingService.generate_pdf(db, session_id)
            return StreamingResponse(
                io.BytesIO(content),
                media_type="application/pdf",
                headers={"Content-Disposition": f"attachment; filename=investigation_{session_id}.pdf"}
            )
    except Exception as e:
        logger.error(f"API Error generating report: {str(e)}")
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")
