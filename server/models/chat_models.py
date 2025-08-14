from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime

class ChatMessage(BaseModel):
    """Individual chat message"""
    role: Literal["user", "assistant", "system"]
    content: str
    timestamp: Optional[datetime] = None

class ActionButton(BaseModel):
    """Action button for assistant responses"""
    type: Literal["call", "schedule", "resource"]
    label: str
    href: str

class Citation(BaseModel):
    """Citation/source for assistant responses"""
    title: str
    url: str

class SearchSource(BaseModel):
    """Source from web search results"""
    title: str
    url: str
    snippet: str
    score: Optional[float] = None

class ChatRequest(BaseModel):
    """Request to send a chat message"""
    session_id: str = Field(..., description="Session identifier")
    message: str = Field(..., min_length=1, max_length=2000, description="User message content")
    language: Optional[str] = Field("en", description="Preferred response language")
    intent: Optional[str] = Field(None, description="Intent classification")
    context: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional context")

class PIIDetectionResult(BaseModel):
    """Result from PII detection"""
    has_pii: bool
    detected_types: List[str]
    redaction_notice: Optional[str] = None
    confidence: float = 0.0
    original_length: int
    sanitized_length: int

class ChatResponse(BaseModel):
    """Response from chat endpoint"""
    session_id: str
    message: str
    language: str
    actions: Optional[List[ActionButton]] = None
    citations: Optional[List[Citation]] = None
    search_sources: Optional[List[SearchSource]] = None
    intent: Optional[str] = None
    pii_detection: Optional[PIIDetectionResult] = None
    timestamp: datetime
    processing_time_ms: int

class ChatHistoryRequest(BaseModel):
    """Request to get chat history"""
    session_id: str
    limit: Optional[int] = Field(50, ge=1, le=100)

class ChatHistoryResponse(BaseModel):
    """Response with chat history"""
    session_id: str
    messages: List[ChatMessage]
    total_count: int
    session_info: Optional[Dict[str, Any]] = None

class NewSessionRequest(BaseModel):
    """Request to create a new session"""
    language: Optional[str] = Field("en", description="Initial language preference")

class NewSessionResponse(BaseModel):
    """Response with new session"""
    session_id: str
    language: str
    created_at: datetime

class SessionInfoResponse(BaseModel):
    """Session information response"""
    session_id: str
    created_at: datetime
    last_activity: datetime
    message_count: int
    language: str

class HealthCheckResponse(BaseModel):
    """Health check response"""
    status: str
    timestamp: datetime
    service: str
    version: str
    environment: str
    databricks: Optional[Dict[str, Any]] = None

class ErrorResponse(BaseModel):
    """Error response"""
    error: str
    message: str
    timestamp: datetime
    path: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
