import httpx
from typing import Any, Optional
from app.config import settings

ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"


async def get_claude_json(
    system: str,
    prompt: str,
    fallback: Any,
    model: str = "claude-sonnet-4-20250514",
    max_tokens: int = 2000,
) -> Any:
    if not settings.anthropic_api_key and settings.openai_api_key:
        return await get_openai_json(system, prompt, fallback)

    if not settings.anthropic_api_key:
        return fallback

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                ANTHROPIC_API_URL,
                headers={
                    "x-api-key": settings.anthropic_api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": model,
                    "max_tokens": max_tokens,
                    "system": system,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )
            data = response.json()
            text = data.get("content", [{}])[0].get("text", "")
            import json
            parsed = json.loads(text)
            return parsed
    except Exception as e:
        logger = __import__("logging").getLogger("zerogap")
        logger.warning(f"Claude API failed: {e}, falling back to OpenAI")
        if settings.openai_api_key:
            return await get_openai_json(system, prompt, fallback)
        return fallback


async def get_openai_json(
    system: str,
    prompt: str,
    fallback: Any,
    model: str = "gpt-4o",
    api_key: Optional[str] = None,
) -> Any:
    key = api_key or settings.openai_api_key
    if not key:
        return fallback

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                OPENAI_API_URL,
                headers={
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": prompt},
                    ],
                    "response_format": {"type": "json_object"},
                },
            )
            data = response.json()
            text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            import json
            parsed = json.loads(text)
            return parsed
    except Exception as e:
        logger = __import__("logging").getLogger("zerogap")
        logger.warning(f"OpenAI API failed: {e}")
        return fallback


async def get_mentor_response(system: str, prompt: str, fallback: str) -> str:
    key = settings.mentor_openai_api_key or settings.openai_api_key
    if not key:
        return fallback

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                OPENAI_API_URL,
                headers={
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o",
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": prompt},
                    ],
                },
            )
            data = response.json()
            return data.get("choices", [{}])[0].get("message", {}).get("content", fallback)
    except Exception as e:
        logger = __import__("logging").getLogger("zerogap")
        logger.warning(f"Mentor API failed: {e}")
        return fallback
