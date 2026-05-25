import os
import json
from typing import Dict, Any, Type
from pydantic import BaseModel
from app.integrations.groq.client import GroqClient
from app.utils.logging import logger

class GroqService:
    PROMPTS_DIR = os.path.join(os.path.dirname(__file__), "prompts")

    @classmethod
    def load_prompt(cls, filename: str) -> str:
        filepath = os.path.join(cls.PROMPTS_DIR, filename)
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                return f.read().strip()
        except Exception as e:
            logger.error(f"Failed to load prompt template {filename}: {str(e)}")
            return ""

    @classmethod
    async def get_structured_completion(
        cls, 
        prompt_file: str, 
        context_data: Dict[str, Any], 
        response_model: Type[BaseModel],
        max_tokens: int = 1000
    ) -> Dict[str, Any]:
        """
        Loads the system prompt, formats context, and calls Groq for strict JSON parsing.
        """
        system_prompt = cls.load_prompt(prompt_file)
        if not system_prompt:
            return {"success": False, "error": "PromptLoadFailure"}

        user_content = json.dumps(context_data, default=str)
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ]

        # Use Pydantic JSON schema format
        schema_format = {"type": "json_object"}
        
        # Dispatch to Groq
        response = await GroqClient.call_completion(
            messages=messages, 
            max_tokens=max_tokens, 
            response_format=schema_format
        )

        if not response.get("success"):
            return response

        try:
            # Parse and validate against the Pydantic schema
            raw_content = response.get("content", "{}")
            json_parsed = json.loads(raw_content)
            validated_data = response_model(**json_parsed).dict()
            
            return {
                "success": True,
                "data": validated_data,
                "usage": response.get("usage", {}),
                "latency": response.get("latency", 0)
            }
        except Exception as e:
            logger.error(f"Failed to parse or validate Groq output: {str(e)} -> {response.get('content')}")
            return {"success": False, "error": "OutputValidationFailure", "details": str(e)}
