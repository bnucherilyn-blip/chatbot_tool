import os
import json
import asyncio
import re
from pathlib import Path
from typing import Optional
import httpx

BASE_DIR = Path(__file__).resolve().parent.parent
PERSONA_PROMPT = (BASE_DIR / "persona.md").read_text(encoding="utf-8")
INTRO_PROMPT = (BASE_DIR / "intro.md").read_text(encoding="utf-8")

API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
BASE_URL = "https://api.deepseek.com"
MODEL = "deepseek-chat"
SEMAPHORE = asyncio.Semaphore(3)


def get_default_model_config() -> dict:
    return {
        "base_url": BASE_URL,
        "model": MODEL,
        "api_key": "",
    }


def resolve_chat_completions_url(base_url: str) -> str:
    normalized = base_url.rstrip("/")
    if normalized.endswith("/chat/completions"):
        return normalized
    if normalized.endswith("/v1"):
        return f"{normalized}/chat/completions"
    return f"{normalized}/chat/completions"


def get_resolved_request_info(base_url: Optional[str], model: Optional[str]) -> dict:
    return {
        "request_url": resolve_chat_completions_url(base_url or BASE_URL),
        "model": model or MODEL,
    }


def get_key_fingerprint(api_key: Optional[str]) -> dict:
    resolved = api_key or API_KEY
    if not resolved:
        return {
            "key_length": 0,
            "key_preview": "",
        }
    preview = resolved if len(resolved) <= 8 else f"{resolved[:4]}...{resolved[-4:]}"
    return {
        "key_length": len(resolved),
        "key_preview": preview,
    }


def should_disable_thinking(model: Optional[str]) -> bool:
    return (model or MODEL).startswith("deepseek-v4")


async def _call_llm(
    system: str,
    user: str,
    temperature: float = 0.8,
    max_tokens: int = 2000,
    base_url: Optional[str] = None,
    model: Optional[str] = None,
    api_key: Optional[str] = None,
) -> str:
    resolved_api_key = api_key or API_KEY
    if not resolved_api_key:
        raise RuntimeError("API Key 未配置，请在设置页填写或在后端环境变量中设置 DEEPSEEK_API_KEY")

    headers = {
        "Authorization": f"Bearer {resolved_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model or MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if should_disable_thinking(model):
        payload["thinking"] = {"type": "disabled"}
    request_url = resolve_chat_completions_url(base_url or BASE_URL)
    async with SEMAPHORE:
        async with httpx.AsyncClient(timeout=45) as client:
            resp = await client.post(request_url, headers=headers, json=payload)
            try:
                resp.raise_for_status()
            except httpx.HTTPStatusError as exc:
                raise RuntimeError(f"模型服务请求失败：{exc.response.status_code} {exc.response.text}") from exc
            data = resp.json()
    return data["choices"][0]["message"]["content"].strip()


async def generate_persona(
    name: str,
    gender: str,
    age: str,
    role_type: str,
    personality: str,
    occupation: str,
    scenario: str,
    language: str,
    system_prompt: Optional[str] = None,
    base_url: Optional[str] = None,
    model: Optional[str] = None,
    api_key: Optional[str] = None,
) -> str:
    user_content = f"姓名: {name}\n性别: {gender}\n年龄: {age}\n角色类型: {role_type}\n核心画像: {personality}\n职业: {occupation}\n初始场景: {scenario}\nlanguage: {language}"
    return await _call_llm(
        system_prompt or PERSONA_PROMPT,
        user_content,
        temperature=0.8,
        max_tokens=1200,
        base_url=base_url,
        model=model,
        api_key=api_key,
    )


async def generate_intro(
    persona_prompt: str,
    language: str,
    system_prompt: Optional[str] = None,
    base_url: Optional[str] = None,
    model: Optional[str] = None,
    api_key: Optional[str] = None,
) -> dict:
    user_content = f"chat_extraPrompt:\n{persona_prompt}\n\nlanguage: {language}"
    text = await _call_llm(
        system_prompt or INTRO_PROMPT,
        user_content,
        temperature=0.7,
        max_tokens=400,
        base_url=base_url,
        model=model,
        api_key=api_key,
    )
    if text.startswith("```json"):
        text = text[7:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()
    match = re.search(r"\{.*\}", text, flags=re.DOTALL)
    json_text = match.group(0) if match else text
    try:
        data = json.loads(json_text)
        if not isinstance(data, dict):
            return {"introduction": text, "prologue": "", "raw": text}

        normalized = {str(key).lower(): value for key, value in data.items()}
        introduction = (
            normalized.get("introduction")
            or normalized.get("intro")
            or normalized.get("角色简介")
            or normalized.get("简介")
            or ""
        )
        prologue = (
            normalized.get("prologue")
            or normalized.get("opening")
            or normalized.get("opening_line")
            or normalized.get("开场白")
            or ""
        )
        return {
            "introduction": str(introduction or ""),
            "prologue": str(prologue or ""),
            "raw": text,
        }
    except json.JSONDecodeError:
        return {"introduction": text, "prologue": "", "raw": text}
