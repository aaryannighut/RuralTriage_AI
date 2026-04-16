from typing import Optional
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.settings import Settings

_settings = Settings()
router = APIRouter(prefix="/translate", tags=["Translation"])

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

class TranslationRequest(BaseModel):
    text: str
    target_lang: str  # hi | mr

async def _ask_groq(system_prompt: str, user_message: str) -> Optional[str]:
    key = _settings.GROQ_API_KEY
    if not key:
        return None
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                GROQ_API_URL,
                headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                json={
                    "model": _settings.GROQ_MODEL,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user",   "content": user_message},
                    ],
                    "temperature": 0.1, # Low temperature for consistent translation
                    "max_tokens": 1000,
                },
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"].strip()
    except Exception:
        return None

@router.post("")
async def translate_text(data: TranslationRequest):
    if not data.text:
        return {"translated_text": ""}
    
    lang_name = "Hindi" if data.target_lang == "hi" else "Marathi"
    
    system_prompt = (
        f"You are a professional medical translator for a rural health application. "
        f"Translate the provided English text into clear, natural sounding {lang_name}. "
        f"Maintain any special formatting like numbers or symbols. "
        "Return ONLY the translated text without any explanations or quotation marks."
    )
    
    translated = await _ask_groq(system_prompt, data.text)
    
    if not translated:
        # Fallback to original text if API fails
        return {"translated_text": data.text, "error": "Translation failed"}
        
    return {"translated_text": translated}
