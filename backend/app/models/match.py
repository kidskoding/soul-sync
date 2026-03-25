from datetime import datetime

from pydantic import BaseModel


class Match(BaseModel):
    id: str
    user_a_id: str
    user_b_id: str
    similarity: float | None = None
    status: str = "pending"
    created_at: datetime


class CompatibilityScores(BaseModel):
    values_alignment: float
    communication_style: float
    humor_compatibility: float
    lifestyle_fit: float
    emotional_depth: float
    overall: float
    analysis: str
