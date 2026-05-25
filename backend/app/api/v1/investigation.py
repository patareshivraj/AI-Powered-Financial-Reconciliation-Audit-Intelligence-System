from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.upload import StandardResponse
from app.services.analytics_service import AnalyticsService
from app.services.fuzzy_matching_service import FuzzyMatchingService
from app.services.merchant_intelligence_service import MerchantIntelligenceService
from app.services.anomaly_detection_service import AnomalyDetectionService
from app.utils.logging import logger

router = APIRouter(tags=["Investigation & Analytics"])

@router.get("/analytics/{session_id}", response_model=StandardResponse)
async def get_session_analytics(session_id: str, db: Session = Depends(get_db)):
    """Fetches high-level deterministic analytics for the dashboard."""
    try:
        data = AnalyticsService.get_session_analytics(db, session_id)
        if "error" in data:
            return StandardResponse(success=False, message=data["error"], data=None, errors=[data["error"]])
        return StandardResponse(success=True, message="Analytics retrieved.", data=data, errors=[])
    except Exception as e:
        logger.error(f"API Error fetching analytics: {str(e)}")
        return StandardResponse(success=False, message="Failed fetching analytics.", data=None, errors=[str(e)])

@router.get("/fuzzy-matches/{session_id}", response_model=StandardResponse)
async def get_fuzzy_matches(session_id: str, db: Session = Depends(get_db)):
    """Runs the rapidfuzz engine to find probable matches among orphans."""
    try:
        data = FuzzyMatchingService.detect_probable_matches(db, session_id)
        return StandardResponse(success=True, message="Fuzzy matching completed.", data=data, errors=[])
    except Exception as e:
        logger.error(f"API Error fetching fuzzy matches: {str(e)}")
        return StandardResponse(success=False, message="Failed fetching fuzzy matches.", data=None, errors=[str(e)])

@router.get("/merchant-intelligence/{session_id}", response_model=StandardResponse)
async def get_merchant_intelligence(session_id: str, db: Session = Depends(get_db)):
    """Fetches aggregated merchant statistics and anomaly risk scores."""
    try:
        data = MerchantIntelligenceService.analyze_merchants(db, session_id)
        return StandardResponse(success=True, message="Merchant intelligence retrieved.", data=data, errors=[])
    except Exception as e:
        logger.error(f"API Error fetching merchant intelligence: {str(e)}")
        return StandardResponse(success=False, message="Failed fetching merchant intelligence.", data=None, errors=[str(e)])

@router.get("/anomalies/{session_id}", response_model=StandardResponse)
async def get_anomalies(session_id: str, db: Session = Depends(get_db)):
    """Fetches deterministically detected anomalies for the dashboard."""
    try:
        data = AnomalyDetectionService.detect_anomalies(db, session_id)
        return StandardResponse(success=True, message="Anomalies retrieved.", data=data, errors=[])
    except Exception as e:
        logger.error(f"API Error fetching anomalies: {str(e)}")
        return StandardResponse(success=False, message="Failed fetching anomalies.", data=None, errors=[str(e)])

