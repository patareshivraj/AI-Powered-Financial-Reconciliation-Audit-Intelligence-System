from sqlalchemy.orm import Session
from app.models.base import ReconciliationResult
from app.integrations.groq.groq_service import GroqService
from app.integrations.groq.schemas import MismatchExplanationResponse


class MismatchExplanationService:
    @staticmethod
    async def explain_mismatch(db: Session, result_id: str):
        result = db.query(ReconciliationResult).filter(ReconciliationResult.id == result_id).first()
        if not result:
            return {"success": False, "error": "ReconciliationResultNotFound"}

        bank_data = {
            "amount": result.bank_transaction.amount,
            "reference": result.bank_transaction.reference,
            "description": result.bank_transaction.description,
            "date": str(result.bank_transaction.transaction_date)
        } if result.bank_transaction else None

        ledger_data = {
            "amount": result.ledger_transaction.amount,
            "reference": result.ledger_transaction.reference,
            "description": result.ledger_transaction.description,
            "date": str(result.ledger_transaction.transaction_date)
        } if result.ledger_transaction else None

        context = {
            "status": result.match_type,
            "bank_statement_record": bank_data,
            "external_ledger_record": ledger_data
        }

        return await GroqService.get_structured_completion(
            prompt_file="mismatch_explainer.txt",
            context_data=context,
            response_model=MismatchExplanationResponse,
            max_tokens=500
        )
