import asyncio
import io
import json
from pathlib import Path
from typing import AsyncGenerator, List, Optional

import pandas as pd
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response
from fastapi.staticfiles import StaticFiles

from schemas import CharacterInput, GenerateRequest, CharacterResult, ModelConfig, PromptConfig
from llm import (
    INTRO_PROMPT,
    PERSONA_PROMPT,
    generate_intro,
    generate_persona,
    get_default_model_config,
    get_key_fingerprint,
    get_resolved_request_info,
)

app = FastAPI(title="角色人设批量生成工具")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    return {"ok": True, "service": "chatbot_tool"}


async def process_character(
    char: CharacterInput,
    prompt_config: Optional[PromptConfig] = None,
    model_config: Optional[ModelConfig] = None,
) -> CharacterResult:
    persona_system_prompt = (prompt_config.persona_prompt.strip() if prompt_config else "") or None
    intro_system_prompt = (prompt_config.intro_prompt.strip() if prompt_config else "") or None
    base_url = (model_config.base_url.strip() if model_config else "") or None
    model = (model_config.model.strip() if model_config else "") or None
    api_key = (model_config.api_key.strip() if model_config else "") or None
    result = CharacterResult(
        name=char.name,
        gender=char.gender,
        age=char.age,
        role_type=char.role_type,
        personality=char.personality,
        occupation=char.occupation,
        scenario=char.scenario,
        language=char.language,
    )
    try:
        persona = await generate_persona(
            name=char.name,
            gender=char.gender,
            age=char.age,
            role_type=char.role_type,
            personality=char.personality,
            occupation=char.occupation,
            scenario=char.scenario,
            language=char.language,
            system_prompt=persona_system_prompt,
            base_url=base_url,
            model=model,
            api_key=api_key,
        )
        result.persona_prompt = persona
        result.status = "persona_done"

        intro_data = await generate_intro(
            persona,
            char.language,
            system_prompt=intro_system_prompt,
            base_url=base_url,
            model=model,
            api_key=api_key,
        )
        result.introduction = intro_data.get("introduction", "")
        result.prologue = intro_data.get("prologue", "")
        if not result.introduction and not result.prologue:
            result.status = "intro_error"
            result.error = f"简介/开场白为空，模型原始输出：{intro_data.get('raw', '')}"
            return result
        result.status = "done"
    except Exception as e:
        result.status = "error"
        result.error = str(e)
    return result


@app.post("/api/generate")
async def generate(req: GenerateRequest):
    async def event_stream() -> AsyncGenerator[str, None]:
        total = len(req.characters)
        for i, char in enumerate(req.characters):
            result = await process_character(char, req.prompt_config, req.llm_config)
            event = {"index": i, "total": total, "result": result.model_dump()}
            yield json.dumps(event, ensure_ascii=False) + "\n"

    return StreamingResponse(event_stream(), media_type="application/x-ndjson")


@app.get("/api/prompts/defaults")
async def get_default_prompts():
    return {
        "persona_prompt": PERSONA_PROMPT,
        "intro_prompt": INTRO_PROMPT,
    }


@app.get("/api/model/defaults")
async def get_default_model():
    return get_default_model_config()


@app.post("/api/model/test")
async def test_model(config: ModelConfig):
    base_url = config.base_url.strip() or None
    model = config.model.strip() or None
    api_key = config.api_key.strip() or None
    info = get_resolved_request_info(base_url, model)
    key_info = get_key_fingerprint(api_key)
    try:
        text = await generate_persona(
            name="ConnectionTest",
            gender="",
            age="",
            role_type="",
            personality="brief and practical",
            occupation="",
            scenario="",
            language="English",
            system_prompt="Reply with exactly: ok",
            base_url=base_url,
            model=model,
            api_key=api_key,
        )
        return {
            "ok": True,
            **info,
            **key_info,
            "message": text,
        }
    except Exception as e:
        return {
            "ok": False,
            **info,
            **key_info,
            "error": str(e),
        }


COLUMN_MAP = {
    "姓名": "name", "name": "name",
    "性别": "gender", "gender": "gender",
    "年龄": "age", "age": "age",
    "角色类型": "role_type", "role_type": "role_type",
    "核心画像": "personality", "性格画像": "personality", "personality": "personality",
    "职业": "occupation", "occupation": "occupation",
    "初始场景": "scenario", "场景": "scenario", "scenario": "scenario",
    "语言": "language", "language": "language",
}


@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    content = await file.read()
    if file.filename.endswith(".csv"):
        df = pd.read_csv(io.BytesIO(content))
    else:
        df = pd.read_excel(io.BytesIO(content))

    df.columns = [COLUMN_MAP.get(c.strip().lower(), c.strip().lower()) for c in df.columns]
    records = df.fillna("").to_dict(orient="records")
    characters = []
    for r in records:
        characters.append({
            "name": str(r.get("name", "")),
            "gender": str(r.get("gender", "")),
            "age": str(r.get("age", "")),
            "role_type": str(r.get("role_type", "")),
            "personality": str(r.get("personality", "")),
            "occupation": str(r.get("occupation", "")),
            "scenario": str(r.get("scenario", "")),
            "language": str(r.get("language", "English")),
        })
    return {"characters": characters}


@app.post("/api/export")
async def export_results(results: List[dict]):
    rows = []
    for r in results:
        rows.append({
            "姓名": r.get("name", ""),
            "性别": r.get("gender", ""),
            "年龄": r.get("age", ""),
            "角色类型": r.get("role_type", ""),
            "核心画像": r.get("personality", ""),
            "职业": r.get("occupation", ""),
            "初始场景": r.get("scenario", ""),
            "语言": r.get("language", ""),
            "人设Prompt": r.get("persona_prompt", ""),
            "角色简介": r.get("introduction", ""),
            "开场白": r.get("prologue", ""),
            "状态": r.get("status", ""),
        })
    df = pd.DataFrame(rows)
    buf = io.BytesIO()
    df.to_excel(buf, index=False, engine="openpyxl")
    buf.seek(0)
    return Response(
        content=buf.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=results.xlsx"},
    )


# Serve frontend static files in production
STATIC_DIR = Path(__file__).resolve().parent / "static"
if STATIC_DIR.exists():
    from fastapi.responses import FileResponse

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = STATIC_DIR / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(STATIC_DIR / "index.html")
