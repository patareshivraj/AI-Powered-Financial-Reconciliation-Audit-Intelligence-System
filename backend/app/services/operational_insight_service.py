from sqlalchemy.orm import Session
from app.models.base import ReconciliationSession, ReconciliationResult
from app.integrations.groq.groq_service import GroqService
from app.integrations.groq.schemas import OperationalInsightsResponse
from app.integrations.groq.utils import TokenOptimizationUtils

class OperationalInsightService:
    @staticmethod
    async def generate_insights(db: Session, session_id: str):
        session = db.query(ReconciliationSession).filter(ReconciliationSession.id == session_id).first()
        if not session:
            return {"success": False, "error": "SessionNotFound"}

        mismatches = db.query(ReconciliationResult).filter(
            ReconciliationResult.session_id == session_id,
            ReconciliationResult.status != "MATCHED"
        ).limit(20).all()

        context = {
            "session_metrics": {
                "total": session.total_records,
                "matched": session.matched_records,
                "mismatched": session.mismatch_records
            },
            "discrepancy_samples": TokenOptimizationUtils.extract_mismatch_samples(mismatches)
        }

        return await GroqService.get_structured_completion(
            prompt_file="operational_insights.txt",
            context_data=context,
            response_model=OperationalInsightsResponse,
            max_tokens=800
        )
