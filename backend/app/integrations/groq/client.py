import httpx
from app.core.config import settings
from app.utils.logging import logger
from typing import Dict, Any, List, Optional
import json
import time

class GroqClient:
    """
    Asynchronous connection client for the Groq AI service.
    Implements retries, timeouts, token optimization, and AI observability.
    """
    API_URL = "https://api.groq.com/openai/v1/chat/completions"

    @classmethod
    async def call_completion(
        cls, 
        messages: List[Dict[str, str]], 
        temperature: float = 0.2, 
        max_tokens: int = 1500,
        response_format: Optional[Dict[str, str]] = None,
        retries: int = 2
    ) -> Dict[str, Any]:
        """
        Sends chat context messages to Groq API and parses the response block.
        Tracks observability metrics like latency and tokens.
        """
        api_key = settings.GROQ_API_KEY
        start_time = time.time()

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

        if response_format:
            payload["response_format"] = response_format

        for attempt in range(retries + 1):
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(cls.API_URL, headers=headers, json=payload)
                    
                    if response.status_code != 200:
                        logger.error(f"Groq API returned failure status {response.status_code}: {response.text}")
                        if attempt < retries:
                            continue
                        return {
                            "success": False,
                            "error": f"Groq HTTP {response.status_code}",
                            "content": "Intelligence generation unavailable."
                        }

                    result = response.json()
                    latency = time.time() - start_time
                    usage = result.get("usage", {})
                    
                    # AI OBSERVABILITY LOGGING
                    logger.info(f"AI Observability -> Model: {settings.GROQ_MODEL} | Latency: {latency:.2f}s | Tokens: {usage.get('total_tokens', 0)} | Retries: {attempt}")
                    
                    return {
                        "success": True,
                        "content": result["choices"][0]["message"]["content"],
                        "model": result.get("model", settings.GROQ_MODEL),
                        "usage": usage,
                        "latency": latency
                    }

            except httpx.RequestError as exc:
                logger.error(f"Network error trying to connect to Groq endpoint: {exc}")
                if attempt < retries:
                    continue
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
        Generates realistic audit reviews and categorized suggestions when offline.
        """
        user_message = ""
        for msg in reversed(messages):
            if msg.get("role") == "user":
                user_message = msg.get("content", "")
                break
        
        # Generic mock response structure matching new endpoints
        mock_content = {
            "summary": "Offline Mock: Configure GROQ_API_KEY to see live insight.",
            "status": "OFFLINE_MODE",
            "explanation": "Offline Mode: Configure GROQ_API_KEY.",
            "merchant": "Demo Merchant",
            "category": "Other",
            "payment_mode": "Card",
            "insights": ["Configure GROQ_API_KEY for live insights."],
            "confidence_score": 50,
            "confidence_indicator": "LOW"
        }

        return {
            "success": True,
            "content": json.dumps(mock_content),
            "model": "llama3-70b-8192-offline-fallback",
            "usage": {"total_tokens": 0},
            "latency": 0.01
        }
