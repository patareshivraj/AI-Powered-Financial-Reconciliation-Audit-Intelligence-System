from sqlalchemy.orm import Session
from app.models.base import ReconciliationSession, ReconciliationResult
from app.integrations.groq.groq_service import GroqService
from app.integrations.groq.schemas import ReconciliationSummaryResponse
from app.integrations.groq.utils import TokenOptimizationUtils

class AiSummaryService:
    @staticmethod
    async def generate_summary(db: Session, session_id: str):
        # 1. Fetch Session Stats
        session = db.query(ReconciliationSession).filter(ReconciliationSession.id == session_id).first()
        if not session:
            return {"success": False, "error": "SessionNotFound"}

        # 2. Fetch specific mismatched discrepancies (Limit to 10 for token optimization)
        mismatches = db.query(ReconciliationResult).filter(
            ReconciliationResult.session_id == session_id,
            ReconciliationResult.status.in_(["AMOUNT_MISMATCH", "DATE_MISMATCH", "MISSING_IN_BANK", "MISSING_IN_EXTERNAL"])
        ).limit(10).all()

        context = {
            "total_records": session.total_records,
            "matched_records": session.matched_records,
            "mismatch_records": session.mismatch_records,
            "discrepancy_samples": TokenOptimizationUtils.extract_mismatch_samples(mismatches)
        }

        # 3. Request AI processing
        return await GroqService.get_structured_completion(
            prompt_file="reconciliation_summary.txt",
            context_data=context,
            response_model=ReconciliationSummaryResponse,
            max_tokens=600
        )
