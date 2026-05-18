import os
import json
import asyncio
from pathlib import Path
import httpx

BASE_DIR = Path(__file__).resolve().parent.parent
PERSONA_PROMPT = (BASE_DIR / "persona.md").read_text(encoding="utf-8")
INTRO_PROMPT = (BASE_DIR / "intro.md").read_text(encoding="utf-8")

API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
BASE_URL = "https://api.deepseek.com/chat/completions"
MODEL = "deepseek-chat"
SEMAPHORE = asyncio.Semaphore(3)


async def _call_llm(system: str, user: str, temperature: float = 0.8, max_tokens: int = 2000) -> str:
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    async with SEMAPHORE:
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(BASE_URL, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
    return data["choices"][0]["message"]["content"].strip()


async def generate_persona(name: str, gender: str, age: str, role_type: str, personality: str, occupation: str, scenario: str, language: str) -> str:
    user_content = f"姓名: {name}\n性别: {gender}\n年龄: {age}\n角色类型: {role_type}\n核心画像: {personality}\n职业: {occupation}\n初始场景: {scenario}\nlanguage: {language}"
    return await _call_llm(PERSONA_PROMPT, user_content, temperature=0.8, max_tokens=2000)


async def generate_intro(persona_prompt: str, language: str) -> dict:
    user_content = f"chat_extraPrompt:\n{persona_prompt}\n\nlanguage: {language}"
    text = await _call_llm(INTRO_PROMPT, user_content, temperature=0.7, max_tokens=500)
    if text.startswith("```json"):
        text = text[7:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {"introduction": text, "prologue": ""}
