from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from app.integrations.groq.groq_service import GroqService
from app.services.analytics_service import AnalyticsService
from app.services.merchant_intelligence_service import MerchantIntelligenceService
from app.models.base import ReconciliationResult
from app.integrations.groq.utils import TokenOptimizationUtils

class AiAssistantResponse(BaseModel):
    answer: str = Field(description="The conversational response to the user's analytical query.")
    suggested_filters: dict = Field(default_factory=dict, description="Optional. Any UI filters the user should apply (e.g. {'status': 'DUPLICATE', 'min_amount': 10000})")

class AiAssistantService:
    @staticmethod
    async def process_query(db: Session, session_id: str, query: str):
        # 1. Gather deterministic context
        analytics = AnalyticsService.get_session_analytics(db, session_id)
        merchants = MerchantIntelligenceService.analyze_merchants(db, session_id)
        
        # 2. Gather sample mismatches
        mismatches = db.query(ReconciliationResult).filter(
            ReconciliationResult.session_id == session_id,
            ReconciliationResult.match_type != "MATCHED"
        ).all()
        samples = TokenOptimizationUtils.extract_mismatch_samples(mismatches, max_samples=30)
        
        context = {
            "user_query": query,
            "session_analytics": analytics,
            "top_merchants": merchants[:10], # Only pass top 10 to save tokens
            "discrepancy_samples": samples
        }
        
        # 3. Request Llama 3 to interpret the query given the context
        return await GroqService.get_structured_completion(
            prompt_file="ai_assistant.txt",
            context_data=context,
            response_model=AiAssistantResponse,
            max_tokens=600
        )
