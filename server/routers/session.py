from fastapi import APIRouter, HTTPException, Depends
import logging
from datetime import datetime

from models.chat_models import (
    NewSessionRequest,
    NewSessionResponse,
    SessionInfoResponse
)
from services.chat_history_service import ChatHistoryService

logger = logging.getLogger(__name__)
router = APIRouter()

# Dependency injection
async def get_chat_history_service() -> ChatHistoryService:
    from main import chat_history_service
    if chat_history_service is None:
        raise HTTPException(status_code=503, detail="Chat history service not available")
    return chat_history_service

@router.post("/new", response_model=NewSessionResponse)
async def create_new_session(
    session_request: NewSessionRequest,
    history_service: ChatHistoryService = Depends(get_chat_history_service)
):
    """Create a new chat session"""
    try:
        session_id = history_service.create_session()
        history_service.set_session_locale(session_id, session_request.language)
        
        logger.info(f"Created new session: {session_id} with language: {session_request.language}")
        
        return NewSessionResponse(
            session_id=session_id,
            language=session_request.language,
            created_at=datetime.utcnow()
        )
        
    except Exception as e:
        logger.error(f"Error creating session: {e}")
        raise HTTPException(status_code=500, detail="Failed to create session")

@router.post("/locale")
async def set_session_locale(
    session_id: str,
    locale: str,
    history_service: ChatHistoryService = Depends(get_chat_history_service)
):
    """Set language preference for a session"""
    try:
        # Validate locale
        valid_locales = ["en", "es", "ar", "zh", "pt"]
        if locale not in valid_locales:
            raise HTTPException(status_code=400, detail=f"Invalid locale. Must be one of: {valid_locales}")
        
        # Create session if it doesn't exist
        if session_id not in history_service.sessions:
            history_service.create_session(session_id)
        
        history_service.set_session_locale(session_id, locale)
        
        # Get text direction for the locale
        rtl_locales = ["ar"]
        text_direction = "rtl" if locale in rtl_locales else "ltr"
        
        logger.info(f"Set locale for session {session_id}: {locale}")
        
        return {
            "ok": True,
            "session_id": session_id,
            "locale": locale,
            "dir": text_direction,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error setting session locale: {e}")
        raise HTTPException(status_code=500, detail="Failed to set session locale")

@router.get("/{session_id}/info", response_model=SessionInfoResponse)
async def get_session_info(
    session_id: str,
    history_service: ChatHistoryService = Depends(get_chat_history_service)
):
    """Get information about a session"""
    try:
        session_info = history_service.get_session_info(session_id)
        
        if not session_info:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return SessionInfoResponse(
            session_id=session_info["session_id"],
            created_at=datetime.fromisoformat(session_info["created_at"]),
            last_activity=datetime.fromisoformat(session_info["last_activity"]),
            message_count=session_info["message_count"],
            language=session_info["locale"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting session info: {e}")
        raise HTTPException(status_code=500, detail="Failed to get session info")

@router.delete("/{session_id}")
async def delete_session(
    session_id: str,
    history_service: ChatHistoryService = Depends(get_chat_history_service)
):
    """Delete a chat session"""
    try:
        success = history_service.delete_session(session_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Session not found")
        
        logger.info(f"Deleted session: {session_id}")
        
        return {
            "message": "Session deleted successfully",
            "session_id": session_id,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting session: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete session")

@router.get("/stats")
async def get_session_stats(
    history_service: ChatHistoryService = Depends(get_chat_history_service)
):
    """Get statistics about active sessions (admin endpoint)"""
    try:
        memory_info = history_service.get_memory_usage_info()
        
        return {
            "active_sessions": memory_info["active_sessions"],
            "total_messages": memory_info["total_messages"],
            "average_messages_per_session": memory_info["average_messages_per_session"],
            "max_messages_per_session": memory_info["max_messages_per_session"],
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting session stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get session statistics")

@router.post("/cleanup")
async def cleanup_old_sessions(
    max_age_hours: int = 24,
    history_service: ChatHistoryService = Depends(get_chat_history_service)
):
    """Clean up old sessions (admin endpoint)"""
    try:
        if max_age_hours < 1 or max_age_hours > 168:  # 1 hour to 1 week
            raise HTTPException(status_code=400, detail="max_age_hours must be between 1 and 168")
        
        cleaned_count = history_service.cleanup_old_sessions(max_age_hours)
        
        logger.info(f"Cleaned up {cleaned_count} old sessions (older than {max_age_hours} hours)")
        
        return {
            "message": f"Cleaned up {cleaned_count} old sessions",
            "max_age_hours": max_age_hours,
            "cleaned_sessions": cleaned_count,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cleaning up sessions: {e}")
        raise HTTPException(status_code=500, detail="Failed to cleanup sessions")
