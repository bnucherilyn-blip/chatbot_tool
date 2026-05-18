from typing import List
from pydantic import BaseModel


class CharacterInput(BaseModel):
    name: str
    gender: str = ""
    age: str = ""
    role_type: str = ""
    personality: str = ""
    occupation: str = ""
    scenario: str = ""
    language: str = "English"


class GenerateRequest(BaseModel):
    characters: List[CharacterInput]


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
