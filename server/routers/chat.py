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
    Citation,
    SearchSource,
    PIIDetectionResult
)
from services.databricks_service import DatabricksService
from services.chat_history_service import ChatHistoryService
from services.pii_detection_service import PIIDetectionService
from services.tavily_search_service import TavilySearchService

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

async def get_pii_detection_service() -> PIIDetectionService:
    from main import pii_detection_service
    if pii_detection_service is None:
        raise HTTPException(status_code=503, detail="PII detection service not available")
    return pii_detection_service

async def get_tavily_search_service() -> TavilySearchService:
    from main import tavily_search_service
    # Note: Tavily is optional, so we don't raise an error if it's not available
    return tavily_search_service

@router.post("/message", response_model=ChatResponse)
async def send_message(
    chat_request: ChatRequest,
    databricks_service: DatabricksService = Depends(get_databricks_service),
    history_service: ChatHistoryService = Depends(get_chat_history_service),
    pii_service: PIIDetectionService = Depends(get_pii_detection_service),
    search_service: TavilySearchService = Depends(get_tavily_search_service)
):
    """Send a message to the MSK Assistant"""
    start_time = time.time()
    
    try:
        logger.info(f"Processing message for session {chat_request.session_id} in language: '{chat_request.language}' - Message: '{chat_request.message[:50]}...'")
        
        # STEP 1: PII DETECTION & SANITIZATION
        logger.info(f"Step 1: Starting PII detection for session {chat_request.session_id}")
        pii_result = await pii_service.detect_and_sanitize_pii(chat_request.message, chat_request.language)
        
        # Use sanitized message for processing
        processed_message = pii_result["sanitized_text"]
        
        if pii_result["has_pii"]:
            logger.warning(f"PII detected in session {chat_request.session_id}: {pii_result['detected_types']}")
            logger.info(f"Original message length: {pii_result['original_length']}, Sanitized: {pii_result['sanitized_length']}")
        else:
            logger.info(f"No PII detected in session {chat_request.session_id}")
        
        # Ensure session exists
        if chat_request.session_id not in history_service.sessions:
            history_service.create_session(chat_request.session_id)
        
        # Set session language
        history_service.set_session_locale(chat_request.session_id, chat_request.language)
        
        # CRITICAL: Only store sanitized message in history (HIPAA compliance)
        history_service.add_message(chat_request.session_id, "user", processed_message)
        
        # Get conversation context (all messages are already sanitized)
        context_messages = history_service.get_context_for_llm(chat_request.session_id)
        
        # STEP 2: WEB SEARCH (if needed and available)
        search_context = ""
        search_sources = []
        if search_service and search_service.is_available():
            # Use LLM to determine if search is needed
            should_search = await search_service.should_trigger_search(processed_message, databricks_service)
            if should_search:
                logger.info(f"Step 2a: LLM determined search is needed for session {chat_request.session_id}")
                search_results = await search_service.search(processed_message, databricks_service)
                if search_results:
                    search_context = search_service.format_search_results_for_context(search_results)
                    # Convert search results to SearchSource objects for the frontend
                    search_sources = [
                        SearchSource(
                            title=result.title,
                            url=result.url,
                            snippet=result.content[:200] + "..." if len(result.content) > 200 else result.content,
                            score=result.score
                        )
                        for result in search_results[:5]  # Limit to top 5 sources
                    ]
                    logger.info(f"Found {len(search_results)} search results to include in context")
                else:
                    logger.info(f"Search was triggered but no results found for session {chat_request.session_id}")
            else:
                logger.info(f"LLM determined no search needed for session {chat_request.session_id}")
        
        # STEP 3: MAIN PROCESSING with sanitized content and search context
        logger.info(f"Step 3: Sending sanitized message to LLM for session {chat_request.session_id}")
        
        # Enhance context with search results if available
        enhanced_context = context_messages
        if search_context:
            # Add search context as a system message
            enhanced_context = context_messages + [{
                "role": "system",
                "content": f"Additional current information from web search:\n{search_context}\n\nPlease use this information to provide more current and accurate responses when relevant."
            }]
        
        llm_response = await databricks_service.send_message(
            messages=enhanced_context,
            language=chat_request.language,
            max_tokens=1000,
            temperature=0.7
        )
        
        assistant_message = llm_response["content"]
        
        # STEP 4: FINAL RESPONSE FORMATTING with PII notice
        if pii_result["has_pii"] and pii_result["redaction_notice"]:
            # Prepend PII redaction notice to response
            pii_notice = pii_result["redaction_notice"]
            assistant_message = f"{pii_notice}\n\n{assistant_message}"
            logger.info(f"Added PII redaction notice to response for session {chat_request.session_id}")
        
        # Add assistant response to history
        history_service.add_message(chat_request.session_id, "assistant", assistant_message)
        
        # Parse actions and citations from response (enhanced processing)
        actions, citations = _parse_response_enhancements(assistant_message, chat_request.language)
        
        # Calculate processing time
        processing_time = int((time.time() - start_time) * 1000)
        
        # Create PII detection result for response
        pii_detection_result = None
        if pii_result["has_pii"]:
            pii_detection_result = PIIDetectionResult(
                has_pii=pii_result["has_pii"],
                detected_types=pii_result["detected_types"],
                redaction_notice=pii_result["redaction_notice"],
                confidence=pii_result["confidence"],
                original_length=pii_result["original_length"],
                sanitized_length=pii_result["sanitized_length"]
            )
        
        response = ChatResponse(
            session_id=chat_request.session_id,
            message=assistant_message,
            language=chat_request.language,
            actions=actions,
            citations=citations,
            search_sources=search_sources if search_sources else None,
            intent=_classify_intent(processed_message),  # Use sanitized message for intent classification
            pii_detection=pii_detection_result,
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
    
    # Check for symptoms or disease questions (prioritize these for proper handling)
    if any(word in message_lower for word in ["symptoms", "pain", "headache", "fatigue", "nausea", "fever", "swelling", "lump", "bleeding", "shortness of breath", "weight loss"]):
        return "screening_prevention"  # Route to screening for proper medical guidance
    elif any(word in message_lower for word in ["cancer", "tumor", "oncology", "chemotherapy", "radiation", "breast cancer", "lung cancer", "prostate cancer", "leukemia", "lymphoma"]):
        return "glossary_education"  # Route to education for disease information
    # Check for getting started intent
    elif any(word in message_lower for word in ["get started", "how do i", "begin", "start", "first", "new patient"]):
        return "getting_started"
    # Check for screening and prevention
    elif any(word in message_lower for word in ["screen", "test", "check", "exam", "prevention", "risk"]):
        return "screening_prevention"
    # Check for scheduling and appointments
    elif any(word in message_lower for word in ["appointment", "schedule", "book", "reschedule", "prepare"]):
        return "scheduling_appointments"
    # Check for financial and insurance
    elif any(word in message_lower for word in ["cost", "price", "insurance", "pay", "financial", "assistance", "billing"]):
        return "financial_insurance"
    # Check for supportive care
    elif any(word in message_lower for word in ["support", "counseling", "spiritual", "integrative"]):
        return "supportive_care"
    # Check for AYA and caregiver
    elif any(word in message_lower for word in ["young adult", "aya", "caregiver", "peer", "group"]):
        return "aya_caregiver"
    # Check for navigation and logistics
    elif any(word in message_lower for word in ["location", "address", "direction", "where", "parking", "transit", "visit"]):
        return "navigation_logistics"
    # Check for glossary and education
    elif any(word in message_lower for word in ["meaning", "definition", "explain", "learn", "education", "term"]):
        return "glossary_education"
    # Check for clinical trials
    elif any(word in message_lower for word in ["trial", "study", "research", "clinical", "experiment"]):
        return "clinical_trials"
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
