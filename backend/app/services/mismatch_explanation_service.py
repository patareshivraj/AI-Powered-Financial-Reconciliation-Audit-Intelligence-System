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
            "status": result.match_type,
            "bank_statement_record": {c.name: getattr(result.bank_transaction, c.name) for c in result.bank_transaction.__table__.columns} if result.bank_transaction else None,
            "external_ledger_record": {c.name: getattr(result.ledger_transaction, c.name) for c in result.ledger_transaction.__table__.columns} if result.ledger_transaction else None
        }

        return await GroqService.get_structured_completion(
            prompt_file="mismatch_explainer.txt",
            context_data=context,
            response_model=MismatchExplanationResponse,
            max_tokens=500
        )
