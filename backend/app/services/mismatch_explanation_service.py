from sqlalchemy.orm import Session
from app.models.base import ReconciliationResult
from app.integrations.groq.groq_service import GroqService
from app.integrations.groq.schemas import MismatchExplanationResponse


class MismatchExplanationService:
    @staticmethod
    async def explain_mismatch(db: Session, result_id: int):
        result = db.query(ReconciliationResult).filter(ReconciliationResult.id == result_id).first()
        if not result:
            return {"success": False, "error": "ReconciliationResultNotFound"}

        context = {
            "status": result.status,
            "bank_statement_record": result.bank_record_data,
            "external_ledger_record": result.external_record_data
        }

        return await GroqService.get_structured_completion(
            prompt_file="mismatch_explainer.txt",
            context_data=context,
            response_model=MismatchExplanationResponse,
            max_tokens=500
        )
