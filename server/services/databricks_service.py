import httpx
import os
import logging
from typing import List, Dict, Optional, Any
from datetime import datetime

logger = logging.getLogger(__name__)

class DatabricksService:
    """Service to interact with Databricks Claude endpoint"""
    
    def __init__(self):
        self.endpoint = os.getenv("DATABRICKS_ENDPOINT")
        self.pat = os.getenv("DATABRICKS_PAT")
        
        if not self.endpoint or not self.pat:
            raise ValueError("DATABRICKS_ENDPOINT and DATABRICKS_PAT must be set in environment variables")
        
        # Configure HTTP client
        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0),
            headers={
                "Authorization": f"Bearer {self.pat}",
                "Content-Type": "application/json",
            }
        )
        
        logger.info(f"Databricks service initialized with endpoint: {self.endpoint}")

    async def send_message(
        self, 
        messages: List[Dict[str, str]], 
        language: str = "en", 
        max_tokens: int = 1000,
        temperature: float = 0.7
    ) -> Dict[str, Any]:
        """
        Send messages to Claude via Databricks
        
        Args:
            messages: List of conversation messages
            language: Target language for response
            max_tokens: Maximum tokens in response
            temperature: Temperature for response generation
            
        Returns:
            Dict with response content and metadata
        """
        try:
            # Add language instruction and format messages
            language_instruction = self._get_language_instruction(language)
            formatted_messages = self._format_messages(messages, language_instruction)
            
            payload = {
                "messages": formatted_messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "top_p": 0.9,
                "stream": False
            }

            logger.info(f"Sending request to Databricks: {len(formatted_messages)} messages, language: '{language}' - Language instruction: '{self._get_language_instruction(language)[:50]}...'")
            
            response = await self.client.post(self.endpoint, json=payload)
            
            if response.status_code == 200:
                data = response.json()
                
                # Handle different response formats from Databricks
                content = self._extract_content(data)
                
                return {
                    "content": content,
                    "usage": data.get("usage"),
                    "model": data.get("model", "claude-3-sonnet"),
                    "timestamp": datetime.utcnow().isoformat(),
                    "language": language
                }
            else:
                logger.error(f"Databricks API error: {response.status_code} - {response.text}")
                raise Exception(f"Databricks API returned {response.status_code}: {response.text}")
                
        except httpx.TimeoutException:
            logger.error("Request to Databricks timed out")
            raise Exception("Request timeout - the service took too long to respond")
        except httpx.RequestError as e:
            logger.error(f"Request error: {e}")
            raise Exception(f"Failed to connect to Databricks: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error in Databricks service: {e}")
            raise

    def _format_messages(self, messages: List[Dict[str, str]], language_instruction: str) -> List[Dict[str, str]]:
        """Format messages for Claude API"""
        formatted = []
        
        # Add system message with MSK context and language instruction
        system_message = f"""You are MSK Assistant, a helpful AI assistant for Memorial Sloan Kettering Cancer Center.

Your role:
- Provide information about MSK services, appointments, costs, and cancer care support
- Be warm, supportive, and professional
- Avoid medical advice - always refer to care teams for medical questions
- Keep responses concise and actionable
- Include relevant suggestions for next steps

{language_instruction}

Important guidelines:
- Never provide medical diagnoses or treatment advice
- Always encourage users to contact their care team for medical questions
- For emergencies, direct to 911 or emergency services
- Protect user privacy - don't store or request personal information
- If asked about topics outside MSK services, politely redirect to relevant MSK resources
- When helpful, suggest action buttons like "Call MSK", "Schedule Appointment", or "View Resources"

MSK Services you can help with:
- Cancer screening and early detection programs
- Appointment scheduling and care coordination
- Understanding costs, insurance, and financial assistance
- Support groups and patient resources
- Finding MSK locations and directions
- Explaining medical terms in simple language
- Connecting with specialized care services"""

        formatted.append({
            "role": "system",
            "content": system_message
        })

        # Add conversation messages (filter out system messages from history)
        for msg in messages:
            if msg.get("role") in ["user", "assistant"]:
                formatted.append({
                    "role": msg["role"],
                    "content": msg["content"]
                })

        return formatted

    def _get_language_instruction(self, language: str) -> str:
        """Get language-specific instruction"""
        instructions = {
            "en": "Respond in English with a warm, supportive tone. Use clear, accessible language.",
            "es": "Responde en español con un tono cálido y de apoyo. Usa un lenguaje claro y accesible.",
            "ar": "أجب باللغة العربية بنبرة دافئة وداعمة. استخدم لغة واضحة ومفهومة.",
            "zh": "用中文回答，语调温暖支持。使用清晰易懂的语言。",
            "pt": "Responda em português com um tom caloroso e de apoio. Use linguagem clara e acessível."
        }
        
        return instructions.get(language, instructions["en"])

    def _extract_content(self, data: Dict[str, Any]) -> str:
        """Extract content from various Databricks response formats"""
        # Try different possible response formats
        
        # Handle OpenAI-style choices format (Databricks Claude endpoint)
        if "choices" in data and isinstance(data["choices"], list) and len(data["choices"]) > 0:
            choice = data["choices"][0]
            if "message" in choice and "content" in choice["message"]:
                return choice["message"]["content"]
            elif "text" in choice:
                return choice["text"]
        
        # Handle direct content formats
        elif "content" in data and isinstance(data["content"], list) and len(data["content"]) > 0:
            return data["content"][0].get("text", "")
        elif "content" in data and isinstance(data["content"], str):
            return data["content"]
        elif "message" in data:
            return data["message"]
        elif "response" in data:
            return data["response"]
        elif "text" in data:
            return data["text"]
        else:
            logger.warning(f"Unexpected response format: {data}")
            return "I apologize, but I encountered an issue processing your request. Please try again or contact MSK directly."

    async def health_check(self) -> Dict[str, Any]:
        """Health check for Databricks connection"""
        try:
            test_payload = {
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a test assistant. Respond with only 'OK'."
                    },
                    {
                        "role": "user",
                        "content": "Health check"
                    }
                ],
                "max_tokens": 10,
                "temperature": 0
            }

            response = await self.client.post(self.endpoint, json=test_payload)
            
            return {
                "status": "healthy" if response.status_code == 200 else "unhealthy",
                "status_code": response.status_code,
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }

    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()
