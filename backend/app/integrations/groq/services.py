from typing import List, Dict, Any, Optional
import json
from app.models.base import Transaction, ReconciliationResult
from app.integrations.groq.client import GroqClient
from app.integrations.groq.prompts import GroqPrompts
from app.integrations.groq.schemas import (
    MismatchExplanationResponse,
    NarrationParsingResponse,
    ReconciliationSummaryInsightResponse
)
from app.integrations.groq.utils import TokenOptimizationUtils
from app.utils.logging import logger

class GroqIntelligenceService:
    """
    Orchestrates approved AI Tasks using Groq Llama3.
    Acts purely as an intelligence augmentation layer, leaving matching truth completely deterministic.
    """

    @staticmethod
    async def explain_mismatch(
        bank_tx: Optional[Transaction],
        ledger_tx: Optional[Transaction]
    ) -> MismatchExplanationResponse:
        """
        Generates an assistive diagnostic explanation for a discrepant transaction pairing.
        """
        logger.info("AI: Formatting discrepancy context for mismatch explanation...")
        
        # Build compact text context representation
        context = {
            "bank_statement_record": {
                "amount": bank_tx.amount if bank_tx else "N/A",
                "date": bank_tx.transaction_date.strftime("%Y-%m-%d %H:%M:%S") if bank_tx else "N/A",
                "reference": bank_tx.reference if bank_tx else "N/A",
                "description": bank_tx.description if bank_tx else "N/A"
            } if bank_tx else None,
            "external_ledger_record": {
                "amount": ledger_tx.amount if ledger_tx else "N/A",
                "date": ledger_tx.transaction_date.strftime("%Y-%m-%d %H:%M:%S") if ledger_tx else "N/A",
                "reference": ledger_tx.reference if ledger_tx else "N/A",
                "description": ledger_tx.description if ledger_tx else "N/A"
            } if ledger_tx else None
        }

        user_content = f"Please explain the mismatch in this record pairing: {json.dumps(context)}"

        messages = [
            {"role": "system", "content": GroqPrompts.MISMATCH_EXPLANATION_SYSTEM},
            {"role": "user", "content": user_content}
        ]

        response = await GroqClient.call_completion(
            messages=messages,
            temperature=0.1,
            response_format={"type": "json_object"}
        )

        try:
            # Fallback check
            parsed_data = json.loads(response["content"])
            return MismatchExplanationResponse(**parsed_data)
        except Exception as e:
            logger.error(f"Failed parsing/validating Groq mismatch output: {e}. Raw content: {response.get('content')}")
            return MismatchExplanationResponse(
                explanation="A discrepancy exists between bank and ledger records. Manual auditor verification is required.",
                category_prediction="MANUAL_REVIEW_REQUIRED",
                suggested_action="Manually cross-verify details with support tickets.",
                confidence_score=50,
                confidence_indicator="LOW"
            )

    @staticmethod
    async def parse_narration(raw_narration: str) -> NarrationParsingResponse:
        """
        Decodes transaction description strings to extract clean vendor/merchant names
        and predict expense categories.
        """
        logger.info(f"AI: Parsing narration memo for detail: {raw_narration[:40]}...")
        
        messages = [
            {"role": "system", "content": GroqPrompts.NARRATION_PARSING_SYSTEM},
            {"role": "user", "content": f"Parse this transaction memo string: '{raw_narration}'"}
        ]

        response = await GroqClient.call_completion(
            messages=messages,
            temperature=0.1,
            response_format={"type": "json_object"}
        )

        try:
            parsed_data = json.loads(response["content"])
            return NarrationParsingResponse(**parsed_data)
        except Exception as e:
            logger.error(f"Failed validating Groq narration output: {e}. Raw content: {response.get('content')}")
            return NarrationParsingResponse(
                merchant_name="Unknown Merchant",
                predicted_category="General Expense",
                cleaned_narration=raw_narration,
                confidence_score=40
            )

    @staticmethod
    async def generate_audit_insights(
        total_bank_count: int,
        total_external_count: int,
        matched_count: int,
        results: List[ReconciliationResult]
    ) -> ReconciliationSummaryInsightResponse:
        """
        Inspects session results, selects a compact token-optimized sample of discrepancies,
        and generates high-level operational summary observations.
        """
        logger.info("AI: Compiling audit metrics and discrepancy samples for summary generation...")

        # 1. Preprocess and select optimized sample set to prevent rate limits
        samples = TokenOptimizationUtils.extract_mismatch_samples(results, max_samples=10)

        # 2. Build summary metadata block
        metadata = {
            "aggregate_metrics": {
                "total_bank_transactions": total_bank_count,
                "total_external_transactions": total_external_count,
                "perfect_matches_identified": matched_count,
                "reconciliation_efficiency_ratio": f"{round((matched_count / (total_bank_count or 1)) * 100, 2)}%"
            },
            "discrepancy_sample_cases": samples
        }

        user_content = (
            f"Review these audit aggregates and discrepant transaction pairings, "
            f"then compile executive observations and insights: {json.dumps(metadata)}"
        )

        messages = [
            {"role": "system", "content": GroqPrompts.RECONCILIATION_SUMMARY_SYSTEM},
            {"role": "user", "content": user_content}
        ]

        response = await GroqClient.call_completion(
            messages=messages,
            temperature=0.2,
            response_format={"type": "json_object"}
        )

        try:
            parsed_data = json.loads(response["content"])
            return ReconciliationSummaryInsightResponse(**parsed_data)
        except Exception as e:
            logger.error(f"Failed validating Groq audit summary output: {e}. Raw content: {response.get('content')}")
            return ReconciliationSummaryInsightResponse(
                observations="Deterministic matching completed successfully. Ready for manual reviewer validation.",
                insights=[
                    "Configure a valid GROQ_API_KEY in the Settings tab to activate AI audit observations.",
                    "Discrepancies isolated under the workspace grid have been structured for review."
                ],
                confidence_score=60,
                confidence_indicator="MEDIUM"
            )
