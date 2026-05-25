import httpx
from app.core.config import settings
from app.utils.logging import logger
from typing import Dict, Any, List, Optional
import json

class GroqClient:
    """
    Asynchronous connection client for the Groq AI Chat Completions service.
    Implements structured JSON prompts and handles communication limits.
    """
    API_URL = "https://api.groq.com/openai/v1/chat/completions"

    @classmethod
    async def call_completion(
        cls, 
        messages: List[Dict[str, str]], 
        temperature: float = 0.2, 
        max_tokens: int = 1500,
        response_format: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Sends chat context messages to Groq API and parses the response block.
        """
        api_key = settings.GROQ_API_KEY

        # Graceful fallback mode if API Key is not configured
        if not api_key:
            logger.warning("GROQ_API_KEY is not set. Operating in Offline Assistant Mock Mode.")
            return cls._get_mock_fallback_response(messages)

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": settings.GROQ_MODEL,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }

        # Request structured JSON format if supported/specified
        if response_format:
            payload["response_format"] = response_format

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                logger.info(f"Dispatching prompt completion to Groq model: {settings.GROQ_MODEL}...")
                response = await client.post(cls.API_URL, headers=headers, json=payload)
                
                if response.status_code != 200:
                    error_text = response.text
                    logger.error(f"Groq API returned failure status {response.status_code}: {error_text}")
                    return {
                        "success": False,
                        "error": f"Groq HTTP {response.status_code}",
                        "content": "Intelligence generation unavailable due to API authorization limits."
                    }

                result = response.json()
                content = result["choices"][0]["message"]["content"]
                logger.info("Successfully fetched Groq chat completion response.")
                
                return {
                    "success": True,
                    "content": content,
                    "model": result.get("model", settings.GROQ_MODEL),
                    "usage": result.get("usage", {})
                }

        except httpx.RequestError as exc:
            logger.error(f"Network error trying to connect to Groq endpoint: {exc}")
            return {
                "success": False,
                "error": "NetworkConnectionError",
                "content": "Could not establish network connection to the AI engine."
            }
        except Exception as e:
            logger.error(f"Unexpected error in Groq client completions: {str(e)}")
            return {
                "success": False,
                "error": "UnexpectedInternalError",
                "content": "An unexpected error occurred in the AI intelligence layer."
            }

    @classmethod
    def _get_mock_fallback_response(cls, messages: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        Generates realistic audit reviews and categorized suggestions when offline
        to keep the platform completely interactive without a hard crash.
        """
        user_message = ""
        for msg in reversed(messages):
            if msg.get("role") == "user":
                user_message = msg.get("content", "")
                break

        # Check if the user is asking for mismatch explanations or audit comments
        is_summary_request = "summary" in user_message.lower() or "aggregate" in user_message.lower()
        
        if is_summary_request:
            mock_content = {
                "observations": "Offline Mode Indicator: Please configure your GROQ_API_KEY in app settings.",
                "insights": [
                    "Auto-reconciliation shows stable reference alignments across matching rows.",
                    "Discrepancies isolated in amount differences warrant primary review.",
                    "Ensure value date timezones are aligned to standard offset variables."
                ],
                "confidence_score": 95,
                "confidence_indicator": "ASSISTIVE_INTELLIGENCE_FALLBACK"
            }
        else:
            mock_content = {
                "explanation": "Demo Review: To view live AI explanations, enter a valid GROQ_API_KEY in the Settings panel.",
                "category_prediction": "AUDIT_REVIEW_PENDING",
                "suggested_action": "Verify bank statement booking timeline manually.",
                "confidence_score": 85,
                "confidence_indicator": "DEMO_PREVIEW_LIMIT"
            }

        return {
            "success": True,
            "content": json.dumps(mock_content),
            "model": "llama3-70b-8192-offline-fallback",
            "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
        }
