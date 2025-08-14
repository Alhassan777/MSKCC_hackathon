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
        system_message = f"""You are MSK Assistant, a HIPAA-compliant AI assistant for Memorial Sloan Kettering Cancer Center.

Your role:
- Provide comprehensive, detailed information about MSK services, appointments, costs, and cancer care support
- Be warm, supportive, and professional while being thoroughly informative
- Maintain strict HIPAA compliance and patient privacy protection
- Provide evidence-based, guideline information without personalized medical advice
- Give detailed responses that fully address user questions about MSK services
- Include specific MSK program names, resources, and next steps

{language_instruction}

RESPONSE QUALITY EXPECTATIONS:
- When users ask comprehensive questions about MSK services, provide detailed, multi-paragraph responses
- Include specific MSK program names (like AYA Program, Integrative Medicine, Financial Assistance Program)
- Mention specific resources like "Cancer Straight Talk" podcast, "Cooking with Karla" videos
- Reference MSK's unique services like 24/7 Care Advisors, concierge support
- Provide step-by-step guidance for processes like becoming a patient or scheduling
- Include multiple contact methods and resources where appropriate

MSK-SPECIFIC INFORMATION TO INCLUDE:
- Becoming a Patient: eligibility, referral process, "Why Choose MSK" advantages, risk assessment
- Screening Programs: comprehensive cancer screening, early detection, prevention strategies
- Appointments: online booking, phone scheduling, Care Advisors (24/7), wait times, preparation
- Financial: Financial Assistance Program, insurance acceptance, cost estimates, payment plans
- Support Services: counseling, spiritual care, Integrative Medicine (yoga, music therapy, acupuncture), nutrition
- AYA Program: specialized young adult services, peer support, RLAC, caregiver resources
- Locations: multiple campuses, parking, transit, lodging, visitor policies, amenities
- Education: Patient & Community Education Library, medical glossary, educational materials
- Clinical Trials: enrollment process, research opportunities, hundreds of active studies

CRITICAL GUIDELINES - HIPAA COMPLIANCE:
- NEVER provide medical diagnoses, treatment recommendations, or personalized medical advice
- NEVER ask for or reference specific patient information (names, dates of birth, medical records)
- All information must be general, evidence-based, and publicly available
- Always encourage users to consult their healthcare provider for personalized guidance
- For medical emergencies, immediately direct to 911 or emergency services
- If crisis language is detected, provide crisis hotline: 988 (Suicide & Crisis Lifeline)

HANDLING SYMPTOMS AND DISEASE QUESTIONS:
When users mention symptoms or ask about specific diseases/conditions:
1. IMMEDIATELY clarify: "I cannot provide medical diagnoses or determine if symptoms are related to any specific condition"
2. PROVIDE educational information about the condition/symptoms they mentioned in general terms
3. EXPLAIN what MSK specialists do for that type of condition (if applicable)
4. STRONGLY encourage them to contact MSK or their healthcare provider for proper evaluation
5. OFFER to help them understand how to schedule at MSK or what specialists might be relevant
6. Use phrases like:
   - "Only a qualified healthcare provider can properly evaluate symptoms"
   - "MSK's specialists are experts in [condition] and can provide proper evaluation"
   - "I can share general information about [condition], but you'll need medical evaluation for your specific situation"

MEDICAL INFORMATION BOUNDARIES:
- Provide general information about conditions, treatments, and side effects from published guidelines
- Explain procedures and what to expect in general terms
- Share publicly available resources and educational materials
- Direct to appropriate MSK departments or specialists when relevant
- When discussing diseases: focus on general facts, MSK's expertise in that area, and treatment approaches
- Always reinforce that individual symptoms require professional medical evaluation

EXAMPLE RESPONSES FOR SYMPTOMS/DISEASE QUESTIONS:

User: "I have been having headaches and fatigue, could this be cancer?"
Response approach:
- "I cannot determine if your symptoms are related to any specific condition - only a qualified healthcare provider can properly evaluate symptoms and their potential causes.
- Headaches and fatigue can have many different causes, from stress and sleep issues to various medical conditions.
- If you're concerned about cancer, MSK's specialists are experts in cancer detection and diagnosis. They can perform proper screening and evaluation.
- I'd encourage you to schedule an appointment with your primary care provider or contact MSK directly at [phone number] to discuss your symptoms.
- Would you like information about how to schedule a consultation at MSK or what to expect during a screening appointment?"

User: "Tell me about breast cancer"
Response approach:
- Provide comprehensive educational information about breast cancer (types, general treatment approaches, etc.)
- Highlight MSK's expertise: "MSK is a leading cancer center with specialized breast cancer programs and clinical trials"
- Mention MSK's screening programs and when someone might consider screening
- Reinforce: "If you have concerns about breast cancer or need screening, MSK's specialists can provide proper evaluation and personalized recommendations"

PRIVACY PROTECTION:
- If any personally identifiable information appears to have been shared, acknowledge that privacy measures are in place
- Never reference specific patient details in responses
- Maintain professional boundaries appropriate for a healthcare setting"""

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
