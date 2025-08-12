from fastapi import APIRouter, HTTPException, Depends
import logging
from datetime import datetime
import time
from typing import List, Dict, Any

from models.chat_models import (
    ChatRequest, 
    ChatResponse, 
    ChatHistoryRequest, 
    ChatHistoryResponse,
    ActionButton,
    Citation
)
from services.databricks_service import DatabricksService
from services.chat_history_service import ChatHistoryService

logger = logging.getLogger(__name__)
router = APIRouter()

# Dependency injection
async def get_databricks_service() -> DatabricksService:
    from main import databricks_service
    if databricks_service is None:
        raise HTTPException(status_code=503, detail="Databricks service not available")
    return databricks_service

async def get_chat_history_service() -> ChatHistoryService:
    from main import chat_history_service
    if chat_history_service is None:
        raise HTTPException(status_code=503, detail="Chat history service not available")
    return chat_history_service

@router.post("/message", response_model=ChatResponse)
async def send_message(
    chat_request: ChatRequest,
    databricks_service: DatabricksService = Depends(get_databricks_service),
    history_service: ChatHistoryService = Depends(get_chat_history_service)
):
    """Send a message to the MSK Assistant"""
    start_time = time.time()
    
    try:
        logger.info(f"Processing message for session {chat_request.session_id} in {chat_request.language}")
        
        # Ensure session exists
        if chat_request.session_id not in history_service.sessions:
            history_service.create_session(chat_request.session_id)
        
        # Set session language
        history_service.set_session_locale(chat_request.session_id, chat_request.language)
        
        # Add user message to history
        history_service.add_message(chat_request.session_id, "user", chat_request.message)
        
        # Get conversation context
        context_messages = history_service.get_context_for_llm(chat_request.session_id)
        
        # Send to Databricks/Claude
        llm_response = await databricks_service.send_message(
            messages=context_messages,
            language=chat_request.language,
            max_tokens=1000,
            temperature=0.7
        )
        
        assistant_message = llm_response["content"]
        
        # Add assistant response to history
        history_service.add_message(chat_request.session_id, "assistant", assistant_message)
        
        # Parse actions and citations from response (enhanced processing)
        actions, citations = _parse_response_enhancements(assistant_message, chat_request.language)
        
        # Calculate processing time
        processing_time = int((time.time() - start_time) * 1000)
        
        response = ChatResponse(
            session_id=chat_request.session_id,
            message=assistant_message,
            language=chat_request.language,
            actions=actions,
            citations=citations,
            intent=_classify_intent(chat_request.message),
            timestamp=datetime.utcnow(),
            processing_time_ms=processing_time
        )
        
        logger.info(f"Successfully processed message for session {chat_request.session_id} in {processing_time}ms")
        return response
        
    except Exception as e:
        logger.error(f"Error processing message: {e}", exc_info=True)
        
        # Return a helpful error response
        processing_time = int((time.time() - start_time) * 1000)
        
        error_message = _get_error_message(chat_request.language)
        
        return ChatResponse(
            session_id=chat_request.session_id,
            message=error_message,
            language=chat_request.language,
            actions=[ActionButton(
                type="call",
                label=_get_call_label(chat_request.language),
                href="tel:+1-212-639-2000"
            )],
            timestamp=datetime.utcnow(),
            processing_time_ms=processing_time
        )

@router.get("/history", response_model=ChatHistoryResponse)
async def get_chat_history(
    session_id: str,
    limit: int = 50,
    history_service: ChatHistoryService = Depends(get_chat_history_service)
):
    """Get chat history for a session"""
    try:
        if session_id not in history_service.sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        
        messages = history_service.get_session_history(session_id)
        session_info = history_service.get_session_info(session_id)
        
        # Apply limit
        if len(messages) > limit:
            messages = messages[-limit:]
        
        return ChatHistoryResponse(
            session_id=session_id,
            messages=[{
                "role": msg["role"],
                "content": msg["content"],
                "timestamp": msg.get("timestamp")
            } for msg in messages],
            total_count=len(messages),
            session_info=session_info
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting chat history: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve chat history")

@router.delete("/session/{session_id}")
async def clear_session(
    session_id: str,
    history_service: ChatHistoryService = Depends(get_chat_history_service)
):
    """Clear chat history for a session"""
    try:
        if session_id not in history_service.sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        
        success = history_service.clear_session(session_id)
        
        if success:
            return {"message": "Session cleared successfully", "session_id": session_id}
        else:
            raise HTTPException(status_code=500, detail="Failed to clear session")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error clearing session: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear session")

def _parse_response_enhancements(message: str, language: str) -> tuple[List[ActionButton], List[Citation]]:
    """Parse actions and citations from assistant response"""
    actions = []
    citations = []
    
    # Basic logic to add contextual actions based on content
    message_lower = message.lower()
    
    # Add call action for most responses
    call_labels = {
        "en": "Call MSK Now",
        "es": "Llamar a MSK",
        "ar": "اتصل بـ MSK",
        "zh": "致电MSK",
        "pt": "Ligar para MSK"
    }
    
    actions.append(ActionButton(
        type="call",
        label=call_labels.get(language, call_labels["en"]),
        href="tel:+1-212-639-2000"
    ))
    
    # Add scheduling action if relevant
    if any(word in message_lower for word in ["appointment", "schedule", "consulta", "cita", "موعد", "预约", "consulta"]):
        schedule_labels = {
            "en": "Schedule Online",
            "es": "Agendar en Línea",
            "ar": "حجز موعد عبر الإنترنت",
            "zh": "在线预约",
            "pt": "Agendar Online"
        }
        
        actions.append(ActionButton(
            type="schedule",
            label=schedule_labels.get(language, schedule_labels["en"]),
            href="https://mskcc.org/appointments"
        ))
    
    # Add resource action if relevant
    if any(word in message_lower for word in ["resource", "information", "recurso", "información", "مورد", "معلومات", "资源", "信息"]):
        resource_labels = {
            "en": "View Resources",
            "es": "Ver Recursos",
            "ar": "عرض الموارد",
            "zh": "查看资源",
            "pt": "Ver Recursos"
        }
        
        actions.append(ActionButton(
            type="resource",
            label=resource_labels.get(language, resource_labels["en"]),
            href="https://mskcc.org/aya-program"
        ))
    
    # Add a citation for MSK AYA program
    citation_titles = {
        "en": "MSK Young Adult Program",
        "es": "Programa de Adultos Jóvenes MSK",
        "ar": "برنامج البالغين الشباب في MSK",
        "zh": "MSK青年成人项目",
        "pt": "Programa de Jovens Adultos MSK"
    }
    
    citations.append(Citation(
        title=citation_titles.get(language, citation_titles["en"]),
        url="https://mskcc.org/aya-program"
    ))
    
    return actions, citations

def _classify_intent(message: str) -> str:
    """Basic intent classification"""
    message_lower = message.lower()
    
    if any(word in message_lower for word in ["screen", "test", "check", "exam"]):
        return "screening"
    elif any(word in message_lower for word in ["appointment", "schedule", "book"]):
        return "scheduling"
    elif any(word in message_lower for word in ["cost", "price", "insurance", "pay"]):
        return "costs"
    elif any(word in message_lower for word in ["support", "help", "group"]):
        return "aya"
    elif any(word in message_lower for word in ["location", "address", "direction", "where"]):
        return "wayfinding"
    elif any(word in message_lower for word in ["meaning", "definition", "explain"]):
        return "glossary"
    else:
        return "unknown"

def _get_error_message(language: str) -> str:
    """Get error message in specified language"""
    messages = {
        "en": "I apologize, but I encountered an issue processing your request. Please try again or call MSK directly for assistance.",
        "es": "Me disculpo, pero encontré un problema procesando su solicitud. Por favor intente nuevamente o llame a MSK directamente para asistencia.",
        "ar": "أعتذر، ولكنني واجهت مشكلة في معالجة طلبك. يرجى المحاولة مرة أخرى أو الاتصال بـ MSK مباشرة للحصول على المساعدة.",
        "zh": "抱歉，我在处理您的请求时遇到了问题。请重试或直接致电MSK寻求帮助。",
        "pt": "Peço desculpas, mas encontrei um problema ao processar sua solicitação. Tente novamente ou ligue diretamente para o MSK para obter assistência."
    }
    return messages.get(language, messages["en"])

def _get_call_label(language: str) -> str:
    """Get call button label in specified language"""
    labels = {
        "en": "Call MSK Now",
        "es": "Llamar a MSK",
        "ar": "اتصل بـ MSK",
        "zh": "致电MSK",
        "pt": "Ligar para MSK"
    }
    return labels.get(language, labels["en"])
