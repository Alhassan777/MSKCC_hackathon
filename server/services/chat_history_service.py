import logging
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
import json
import uuid
from langchain.memory import ConversationBufferWindowMemory
from langchain.schema import BaseMessage, HumanMessage, AIMessage

logger = logging.getLogger(__name__)

class ChatHistoryService:
    """Service to manage chat history and context using LangChain"""
    
    def __init__(self, max_messages: int = 20):
        """
        Initialize chat history service
        
        Args:
            max_messages: Maximum number of messages to keep in memory per session
        """
        self.max_messages = max_messages
        self.sessions = {}  # In-memory storage for demo - use Redis/DB in production
        self.session_locales = {}  # Store language preferences per session
        
        logger.info(f"Chat history service initialized with max {max_messages} messages per session")

    def create_session(self, session_id: Optional[str] = None) -> str:
        """Create a new chat session"""
        if not session_id:
            session_id = str(uuid.uuid4())
        
        # Initialize LangChain memory for this session
        memory = ConversationBufferWindowMemory(
            k=self.max_messages,
            return_messages=True,
            memory_key="chat_history"
        )
        
        self.sessions[session_id] = {
            "memory": memory,
            "created_at": datetime.utcnow(),
            "last_activity": datetime.utcnow(),
            "message_count": 0
        }
        
        logger.info(f"Created new chat session: {session_id}")
        return session_id

    def get_session_history(self, session_id: str) -> List[Dict[str, Any]]:
        """Get chat history for a session"""
        if session_id not in self.sessions:
            logger.warning(f"Session not found: {session_id}")
            return []
        
        session = self.sessions[session_id]
        memory = session["memory"]
        
        # Get messages from LangChain memory
        messages = memory.chat_memory.messages
        
        # Convert to our format
        history = []
        for msg in messages:
            if isinstance(msg, HumanMessage):
                history.append({
                    "role": "user",
                    "content": msg.content,
                    "timestamp": datetime.utcnow().isoformat()  # Note: LangChain doesn't store timestamps by default
                })
            elif isinstance(msg, AIMessage):
                history.append({
                    "role": "assistant",
                    "content": msg.content,
                    "timestamp": datetime.utcnow().isoformat()
                })
        
        return history

    def add_message(self, session_id: str, role: str, content: str) -> None:
        """Add a message to session history"""
        if session_id not in self.sessions:
            self.create_session(session_id)
        
        session = self.sessions[session_id]
        memory = session["memory"]
        
        # Add message to LangChain memory
        if role == "user":
            memory.chat_memory.add_user_message(content)
        elif role == "assistant":
            memory.chat_memory.add_ai_message(content)
        
        # Update session metadata
        session["last_activity"] = datetime.utcnow()
        session["message_count"] += 1
        
        logger.debug(f"Added {role} message to session {session_id}")

    def get_context_for_llm(self, session_id: str, include_system: bool = True) -> List[Dict[str, str]]:
        """
        Get conversation context formatted for LLM
        
        Args:
            session_id: Session identifier
            include_system: Whether to include system messages
            
        Returns:
            List of messages formatted for LLM
        """
        history = self.get_session_history(session_id)
        
        # Format for LLM (remove timestamps and filter if needed)
        context = []
        for msg in history:
            if msg["role"] in ["user", "assistant"]:
                context.append({
                    "role": msg["role"],
                    "content": msg["content"]
                })
        
        return context

    def set_session_locale(self, session_id: str, locale: str) -> None:
        """Set language preference for a session"""
        self.session_locales[session_id] = locale
        logger.info(f"Set locale for session {session_id}: {locale}")

    def get_session_locale(self, session_id: str) -> str:
        """Get language preference for a session"""
        return self.session_locales.get(session_id, "en")

    def clear_session(self, session_id: str) -> bool:
        """Clear all messages from a session"""
        if session_id not in self.sessions:
            return False
        
        session = self.sessions[session_id]
        memory = session["memory"]
        memory.clear()
        
        session["message_count"] = 0
        session["last_activity"] = datetime.utcnow()
        
        logger.info(f"Cleared session: {session_id}")
        return True

    def delete_session(self, session_id: str) -> bool:
        """Delete a session completely"""
        if session_id in self.sessions:
            del self.sessions[session_id]
            logger.info(f"Deleted session: {session_id}")
            return True
        return False

    def get_session_info(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get information about a session"""
        if session_id not in self.sessions:
            return None
        
        session = self.sessions[session_id]
        return {
            "session_id": session_id,
            "created_at": session["created_at"].isoformat(),
            "last_activity": session["last_activity"].isoformat(),
            "message_count": session["message_count"],
            "locale": self.get_session_locale(session_id)
        }

    def cleanup_old_sessions(self, max_age_hours: int = 24) -> int:
        """
        Clean up sessions older than max_age_hours
        
        Args:
            max_age_hours: Maximum age in hours for sessions
            
        Returns:
            Number of sessions cleaned up
        """
        cutoff_time = datetime.utcnow() - timedelta(hours=max_age_hours)
        sessions_to_delete = []
        
        for session_id, session in self.sessions.items():
            if session["last_activity"] < cutoff_time:
                sessions_to_delete.append(session_id)
        
        for session_id in sessions_to_delete:
            self.delete_session(session_id)
            if session_id in self.session_locales:
                del self.session_locales[session_id]
        
        if sessions_to_delete:
            logger.info(f"Cleaned up {len(sessions_to_delete)} old sessions")
        
        return len(sessions_to_delete)

    def get_active_sessions_count(self) -> int:
        """Get count of active sessions"""
        return len(self.sessions)

    def get_memory_usage_info(self) -> Dict[str, Any]:
        """Get information about memory usage"""
        total_messages = sum(session["message_count"] for session in self.sessions.values())
        
        return {
            "active_sessions": len(self.sessions),
            "total_messages": total_messages,
            "average_messages_per_session": total_messages / len(self.sessions) if self.sessions else 0,
            "max_messages_per_session": self.max_messages
        }
