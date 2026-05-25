from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.upload import StandardResponse
from app.services.ai_summary_service import AiSummaryService
from app.services.mismatch_explanation_service import MismatchExplanationService
from app.services.categorization_service import CategorizationService, NarrationParserService
from app.services.operational_insight_service import OperationalInsightService
from app.utils.logging import logger
from pydantic import BaseModel

router = APIRouter(tags=["AI Intelligence"])

@router.get("/reconciliation-summary/{session_id}", response_model=StandardResponse)
async def get_reconciliation_summary(session_id: str, db: Session = Depends(get_db)):
    """Generates an executive dashboard summary of the reconciliation mismatch counts."""
    logger.info(f"API: Generating AI reconciliation summary for session: {session_id}")
    try:
        res = await AiSummaryService.generate_summary(db, session_id)
        if not res.get("success"):
            return StandardResponse(success=False, message="Summary generation failed.", data=None, errors=[res.get("error")])
        return StandardResponse(success=True, message="AI summary compiled.", data=res.get("data"), errors=[])
    except Exception as e:
        logger.error(f"API Error: {str(e)}")
        return StandardResponse(success=False, message="AI compilation failed.", data=None, errors=[str(e)])

@router.get("/explain-mismatch/{result_id}", response_model=StandardResponse)
async def explain_transaction_mismatch(result_id: int, db: Session = Depends(get_db)):
    """Provides a detailed diagnostic explanation of a single transaction mismatch."""
    logger.info(f"API: Explaining transaction mismatch: {result_id}")
    try:
        res = await MismatchExplanationService.explain_mismatch(db, result_id)
        if not res.get("success"):
            return StandardResponse(success=False, message="Explanation generation failed.", data=None, errors=[res.get("error")])
        return StandardResponse(success=True, message="Assistive AI discrepancy explanation completed.", data=res.get("data"), errors=[])
    except Exception as e:
        logger.error(f"API Error: {str(e)}")
        return StandardResponse(success=False, message="AI analysis failed.", data=None, errors=[str(e)])

@router.post("/operational-insights/{session_id}", response_model=StandardResponse)
async def generate_operational_insights(session_id: str, db: Session = Depends(get_db)):
    """Analyzes system-wide reconciliation failures to provide strategic operational insights."""
    logger.info(f"API: Generating operational insights for session: {session_id}")
    try:
        res = await OperationalInsightService.generate_insights(db, session_id)
        if not res.get("success"):
            return StandardResponse(success=False, message="Insight generation failed.", data=None, errors=[res.get("error")])
        return StandardResponse(success=True, message="Operational insights compiled.", data=res.get("data"), errors=[])
    except Exception as e:
        logger.error(f"API Error: {str(e)}")
        return StandardResponse(success=False, message="Insight generation failed.", data=None, errors=[str(e)])

@router.post("/categorize-transactions/{session_id}", response_model=StandardResponse)
async def categorize_transactions(session_id: str, db: Session = Depends(get_db)):
    """Predicts expense classifications across the workspace datasets."""
    logger.info(f"API: Categorizing transactions for session: {session_id}")
    try:
        res = await CategorizationService.categorize_transactions(db, session_id)
        if not res.get("success"):
            return StandardResponse(success=False, message="Categorization failed.", data=None, errors=[res.get("error")])
        return StandardResponse(success=True, message="Categorization completed.", data=res.get("data"), errors=[])
    except Exception as e:
        logger.error(f"API Error: {str(e)}")
        return StandardResponse(success=False, message="Categorization failed.", data=None, errors=[str(e)])

class NarrationPayload(BaseModel):
    narration: str

@router.post("/parse-narration", response_model=StandardResponse)
async def parse_narration(payload: NarrationPayload):
    """Parses a raw transaction text into vendor, category, and payment mode vectors."""
    try:
        res = await NarrationParserService.parse_narration(payload.narration)
        if not res.get("success"):
            return StandardResponse(success=False, message="Parsing failed.", data=None, errors=[res.get("error")])
        return StandardResponse(success=True, message="Narration parsed.", data=res.get("data"), errors=[])
    except Exception as e:
        return StandardResponse(success=False, message="Parsing failed.", data=None, errors=[str(e)])
