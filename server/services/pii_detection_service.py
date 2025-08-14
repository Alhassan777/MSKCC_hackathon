import httpx
import os
import logging
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime

logger = logging.getLogger(__name__)

class PIIDetectionService:
    """Service to detect and sanitize PII using Claude via Databricks"""
    
    def __init__(self):
        # Use the same Claude endpoint as the main chat service
        self.endpoint = os.getenv("DATABRICKS_ENDPOINT")
        self.pat = os.getenv("DATABRICKS_PAT")
        
        if not self.endpoint or not self.pat:
            raise ValueError("DATABRICKS_ENDPOINT and DATABRICKS_PAT must be set in environment variables")
        
        # Configure HTTP client
        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(15.0),
            headers={
                "Authorization": f"Bearer {self.pat}",
                "Content-Type": "application/json",
            }
        )
        

        
        logger.info(f"PII Detection service initialized")

    async def detect_and_sanitize_pii(self, text: str, language: str = "en") -> Dict[str, Any]:
        """
        Detect and sanitize PII from text using Claude AI
        
        Args:
            text: Input text to scan for PII
            language: Language for processing
            
        Returns:
            Dict with sanitized text, detected PII types, and flags
        """
        try:
            # Use Claude for PII detection and sanitization
            claude_results = await self._detect_pii_with_claude(text, language)
            return claude_results
            
        except Exception as e:
            logger.error(f"PII detection failed: {e}")
            # Fail-safe: if PII detection fails, treat as potentially containing PII
            return {
                "has_pii": True,
                "sanitized_text": "[QUERY SANITIZED DUE TO PROCESSING ERROR]",
                "detected_types": ["processing_error"],
                "confidence": 0.0,
                "redaction_notice": "Query was sanitized due to a processing error to ensure privacy protection.",
                "original_length": len(text),
                "sanitized_length": 0
            }

    async def _detect_pii_with_claude(self, text: str, language: str) -> Dict[str, Any]:
        """Detect PII using Claude AI via Databricks"""
        try:
            # Build specialized PII detection prompt for Claude
            detection_prompt = self._build_claude_pii_prompt(text, language)
            
            payload = {
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a HIPAA-compliant PII detection and sanitization assistant. Your job is to identify and redact personally identifiable information from healthcare-related text while maintaining the meaning for medical guidance."
                    },
                    {
                        "role": "user", 
                        "content": detection_prompt
                    }
                ],
                "max_tokens": 1000,
                "temperature": 0.1,
                "stream": False
            }

            logger.info(f"Sending PII detection request to Claude")
            
            response = await self.client.post(self.endpoint, json=payload)
            
            if response.status_code == 200:
                data = response.json()
                content = self._extract_claude_response(data)
                return self._parse_claude_pii_response(content, text)
            else:
                logger.error(f"Claude PII detection failed: {response.status_code} - {response.text}")
                return {"detected_types": [], "redacted_text": text, "has_pii": False, "confidence": 0.0}
                
        except Exception as e:
            logger.error(f"Claude PII detection error: {e}")
            return {"detected_types": [], "redacted_text": text, "has_pii": False, "confidence": 0.0}

    def _build_claude_pii_prompt(self, text: str, language: str) -> str:
        """Build specialized prompt for Claude PII detection"""
        prompt = f"""I need you to analyze this text for Personally Identifiable Information (PII) and create a sanitized version for healthcare AI processing.

ORIGINAL TEXT: "{text}"

TASK: 
1. Identify ALL PII in the text
2. Replace PII with appropriate [REDACTED_X] placeholders
3. Maintain the medical context and meaning

PII TO DETECT:
- Names (first names, last names, full names like "John", "Smith", "my name is Sarah")
- Ages (specific ages like "I am 25 years old", "12 years old")  
- Dates (birth dates, appointment dates, any specific dates)
- Addresses (street addresses, cities, zip codes)
- Contact info (phone numbers, email addresses)
- Medical identifiers (MRN, patient ID, insurance numbers)
- Any other personal identifiers

RESPOND IN THIS EXACT FORMAT:

PII_DETECTED: [YES/NO]
DETECTED_TYPES: [comma-separated list like: names, ages, contact]
SANITIZED_TEXT: [the original text with PII replaced by [REDACTED] placeholders]
CONFIDENCE: [0.0 to 1.0]

EXAMPLE:
Original: "Hi, my name is John and I am 30 years old with chest pain"
PII_DETECTED: YES
DETECTED_TYPES: names, ages
SANITIZED_TEXT: Hi, my name is [REDACTED] and I am [REDACTED] years old with chest pain
CONFIDENCE: 0.95

Be VERY conservative - if you suspect something might be PII, redact it to protect patient privacy."""
        
        return prompt

    def _extract_claude_response(self, data: Dict[str, Any]) -> str:
        """Extract content from Claude response via Databricks"""
        try:
            # Handle OpenAI-style choices format (Databricks Claude endpoint)
            if "choices" in data and isinstance(data["choices"], list) and len(data["choices"]) > 0:
                choice = data["choices"][0]
                if "message" in choice and "content" in choice["message"]:
                    return choice["message"]["content"]
                elif "text" in choice:
                    return choice["text"]
            
            # Handle direct content format
            elif "content" in data:
                return data["content"]
            elif "text" in data:
                return data["text"]
            
            logger.warning(f"Unexpected Claude response format: {data}")
            return ""
            
        except Exception as e:
            logger.error(f"Error extracting Claude response: {e}")
            return ""

    def _parse_claude_pii_response(self, response_content: str, original_text: str) -> Dict[str, Any]:
        """Parse Claude's structured PII detection response"""
        try:
            response_content = response_content.strip()
            
            # Parse the structured response format
            pii_detected = False
            detected_types = []
            sanitized_text = original_text
            confidence = 0.0
            
            # Extract each field from the response
            lines = response_content.split('\n')
            
            for line in lines:
                line = line.strip()
                if line.startswith('PII_DETECTED:'):
                    pii_detected = 'YES' in line.upper()
                elif line.startswith('DETECTED_TYPES:'):
                    types_str = line.replace('DETECTED_TYPES:', '').strip()
                    if types_str and types_str != '[]':
                        detected_types = [t.strip() for t in types_str.split(',') if t.strip()]
                elif line.startswith('SANITIZED_TEXT:'):
                    sanitized_text = line.replace('SANITIZED_TEXT:', '').strip()
                elif line.startswith('CONFIDENCE:'):
                    try:
                        confidence = float(line.replace('CONFIDENCE:', '').strip())
                    except ValueError:
                        confidence = 0.95 if pii_detected else 0.0
            
            # Generate user-friendly redaction notice
            redaction_notice = None
            if pii_detected and detected_types:
                redaction_notice = self._generate_redaction_notice(detected_types)
            
            result = {
                "has_pii": pii_detected,
                "detected_types": detected_types,
                "sanitized_text": sanitized_text,
                "confidence": confidence,
                "redaction_notice": redaction_notice,
                "original_length": len(original_text),
                "sanitized_length": len(sanitized_text),
                "primary_method": "claude"
            }
            
            logger.info(f"Claude PII detection result: PII={pii_detected}, Types={detected_types}, Confidence={confidence}")
            return result
            
        except Exception as e:
            logger.error(f"Failed to parse Claude PII response: {e}")
            logger.error(f"Response content: {response_content}")
            return {
                "has_pii": False,
                "detected_types": [],
                "sanitized_text": original_text,
                "confidence": 0.0,
                "redaction_notice": None,
                "original_length": len(original_text),
                "sanitized_length": len(original_text),
                "primary_method": "claude"
            }



    def _generate_redaction_notice(self, detected_types: List[str]) -> str:
        """Generate user-friendly notice about PII redaction"""
        
        type_descriptions = {
            'names': 'names',
            'ages': 'age information',
            'dates': 'dates',
            'addresses': 'addresses',
            'contact': 'contact information',
            'phone': 'phone numbers',
            'email': 'email addresses', 
            'medical': 'medical identifiers',
            'insurance': 'insurance information',
            'ssn': 'social security numbers',
            'patient_identifiers': 'patient identifiers'
        }
        
        friendly_types = []
        for pii_type in detected_types:
            if pii_type in type_descriptions:
                friendly_types.append(type_descriptions[pii_type])
            else:
                friendly_types.append(pii_type.replace('_', ' '))
        
        if len(friendly_types) == 1:
            return f"We detected and removed {friendly_types[0]} to protect confidentiality."
        elif len(friendly_types) == 2:
            return f"We detected and removed {friendly_types[0]} and {friendly_types[1]} to protect confidentiality."
        else:
            formatted_types = ", ".join(friendly_types[:-1]) + f", and {friendly_types[-1]}"
            return f"We detected and removed {formatted_types} to protect confidentiality."

    async def health_check(self) -> Dict[str, Any]:
        """Health check for PII detection service"""
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
            logger.error(f"PII service health check failed: {e}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }

    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()
