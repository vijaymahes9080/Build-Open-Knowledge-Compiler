import json
import requests
from typing import Type, TypeVar, Optional, List, Dict, Any
from pydantic import BaseModel
from app.core import config

T = TypeVar("T", bound=BaseModel)

class LocalLLMService:
    @staticmethod
    def get_ollama_models() -> List[str]:
        """
        Fetches the list of active models pulled in local Ollama.
        """
        try:
            r = requests.get(f"{config.OLLAMA_URL}/api/tags", timeout=3)
            if r.status_code == 200:
                models = r.json().get("models", [])
                return [m["name"] for m in models]
        except Exception:
            pass
        return []

    @staticmethod
    def check_ollama_running() -> bool:
        """
        Verifies if Ollama is running locally.
        """
        try:
            r = requests.get(config.OLLAMA_URL, timeout=2)
            return r.status_code == 200
        except Exception:
            return False

    @classmethod
    def generate_structured(
        cls, 
        prompt: str, 
        response_model: Type[T], 
        system_prompt: str = "You are a structured compiler that outputs strict JSON mapping the requested format.",
        fallback_data: Optional[T] = None
    ) -> T:
        """
        Queries Ollama in JSON mode and validates output against a Pydantic response_model.
        """
        model_name = config.LLM_MODEL.replace("ollama/", "")
        
        # Verify model exists, otherwise take first available or default to llama3
        installed = cls.get_ollama_models()
        if installed and model_name not in installed:
            # Try matching prefixes (e.g. llama3:8b matches llama3)
            matching = [m for m in installed if m.startswith(model_name.split(":")[0])]
            if matching:
                model_name = matching[0]
            else:
                model_name = installed[0] # Grab whatever they have

        if not cls.check_ollama_running():
            print(f"Ollama is not running at {config.OLLAMA_URL}. Falling back to default data generator.")
            if fallback_data is not None:
                return fallback_data
            raise ConnectionError("Ollama local service is offline.")

        try:
            payload = {
                "model": model_name,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                "format": "json",
                "stream": False,
                "options": {
                    "temperature": 0.2
                }
            }
            
            # Call Ollama API endpoint directly
            response = requests.post(f"{config.OLLAMA_URL}/api/chat", json=payload, timeout=120)
            response.raise_for_status()
            
            response_json = response.json()
            message_content = response_json["message"]["content"]
            
            # Parse and validate with Pydantic
            parsed_json = json.loads(message_content)
            return response_model(**parsed_json)
            
        except Exception as e:
            print(f"LLM compilation request failed: {e}. Falling back.")
            if fallback_data is not None:
                return fallback_data
            raise e

    @classmethod
    def generate_chat(cls, messages: List[Dict[str, str]], system_prompt: Optional[str] = None) -> str:
        """
        Free-text generation for conversation tutor agent.
        """
        model_name = config.LLM_MODEL.replace("ollama/", "")
        
        installed = cls.get_ollama_models()
        if installed and model_name not in installed:
            matching = [m for m in installed if m.startswith(model_name.split(":")[0])]
            model_name = matching[0] if matching else installed[0]

        if not cls.check_ollama_running():
            return "Local AI service (Ollama) is currently offline. Please run Ollama to converse with the tutor."

        try:
            chat_messages = []
            if system_prompt:
                chat_messages.append({"role": "system", "content": system_prompt})
            chat_messages.extend(messages)
            
            payload = {
                "model": model_name,
                "messages": chat_messages,
                "stream": False
            }
            
            response = requests.post(f"{config.OLLAMA_URL}/api/chat", json=payload, timeout=45)
            response.raise_for_status()
            return response.json()["message"]["content"]
        except Exception as e:
            return f"Tutor Error: Could not reach Ollama model '{model_name}'. Exception: {str(e)}"
