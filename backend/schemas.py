from typing import List, Optional
from pydantic import BaseModel, Field


class CharacterInput(BaseModel):
    name: str
    gender: str = ""
    age: str = ""
    role_type: str = ""
    personality: str = ""
    occupation: str = ""
    scenario: str = ""
    language: str = "English"


class PromptConfig(BaseModel):
    persona_prompt: str = ""
    intro_prompt: str = ""


class ModelConfig(BaseModel):
    base_url: str = ""
    model: str = ""
    api_key: str = ""


class LoginRequest(BaseModel):
    username: str
    password: str


class GenerateRequest(BaseModel):
    characters: List[CharacterInput]
    prompt_config: Optional[PromptConfig] = None
    llm_config: Optional[ModelConfig] = Field(default=None, alias="model_config")


class CharacterResult(BaseModel):
    name: str
    gender: str = ""
    age: str = ""
    role_type: str = ""
    personality: str = ""
    occupation: str = ""
    scenario: str = ""
    language: str = "English"
    persona_prompt: str = ""
    introduction: str = ""
    prologue: str = ""
    status: str = "pending"
    error: str = ""
