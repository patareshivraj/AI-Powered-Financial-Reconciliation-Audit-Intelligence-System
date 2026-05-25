from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.session import get_db
from app.schemas.upload import StandardResponse
from app.services.ai_assistant_service import AiAssistantService
from app.utils.logging import logger

router = APIRouter(tags=["AI Assistant"])

class ChatQueryPayload(BaseModel):
    query: str

@router.post("/chat/{session_id}", response_model=StandardResponse)
async def chat_with_assistant(session_id: str, payload: ChatQueryPayload, db: Session = Depends(get_db)):
    """Conversational endpoint to query reconciliation session data."""
    logger.info(f"API: Processing AI Assistant query for session {session_id}: {payload.query}")
    try:
        res = await AiAssistantService.process_query(db, session_id, payload.query)
        if not res.get("success"):
            return StandardResponse(success=False, message="AI query failed.", data=None, errors=[res.get("error")])
        return StandardResponse(success=True, message="Response generated.", data=res.get("data"), errors=[])
    except Exception as e:
        logger.error(f"API Error processing chat: {str(e)}")
        return StandardResponse(success=False, message="AI analysis failed.", data=None, errors=[str(e)])
