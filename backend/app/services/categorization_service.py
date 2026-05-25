from sqlalchemy.orm import Session
from app.integrations.groq.groq_service import GroqService
from app.integrations.groq.schemas import NarrationParsingResponse

class NarrationParserService:
    @staticmethod
    async def parse_narration(narration_text: str):
        context = {
            "narration": narration_text
        }

        return await GroqService.get_structured_completion(
            prompt_file="narration_parser.txt",
            context_data=context,
            response_model=NarrationParsingResponse,
            max_tokens=300
        )

class CategorizationService:
    @staticmethod
    async def categorize_transactions(db: Session, session_id: str):
        # MVP: Normally this would take a batch of transactions and categorize them.
        # For simplicity, we proxy a demonstration query based on session ID
        context = {
            "instruction": "Evaluate the general dataset scope and return aggregate categorization."
        }
        
        return await GroqService.get_structured_completion(
            prompt_file="narration_parser.txt",
            context_data=context,
            response_model=NarrationParsingResponse,
            max_tokens=400
        )
