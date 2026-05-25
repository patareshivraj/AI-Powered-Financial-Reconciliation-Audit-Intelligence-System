from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.session import get_db
from app.schemas.upload import StandardResponse
from app.services.ai_assistant_service import AiAssistantService
from app.core.security import sanitize_ai_query
from app.utils.logging import logger

router = APIRouter(tags=["AI Assistant"])

class ChatQueryPayload(BaseModel):
    query: str

from app.core.auth import require_analyst_or_admin
from app.models.base import User

@router.post("/chat/{session_id}", response_model=StandardResponse)
async def chat_with_assistant(
    session_id: str, 
    payload: ChatQueryPayload, 
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst_or_admin)
):
    """Conversational endpoint to query reconciliation session data."""
    clean_query = sanitize_ai_query(payload.query)
    logger.info(f"API: Processing AI Assistant query for session {session_id}: {clean_query[:80]}")
    try:
        res = await AiAssistantService.process_query(db, session_id, clean_query)
        if not res.get("success"):
            return StandardResponse(success=False, message="AI query failed.", data=None, errors=[res.get("error")])
        return StandardResponse(success=True, message="Response generated.", data=res.get("data"), errors=[])
    except Exception as e:
        logger.error(f"API Error processing chat: {str(e)}")
        return StandardResponse(success=False, message="AI analysis failed.", data=None, errors=[str(e)])
