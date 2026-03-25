from pydantic import BaseModel


class CommunicationStyle(BaseModel):
    directness: str
    conflict_approach: str
    love_language: str


class Lifestyle(BaseModel):
    energy_level: str
    social_preference: str
    interests: list[str]
    ideal_weekend: str


class PersonalityData(BaseModel):
    core_values: list[str]
    communication_style: CommunicationStyle
    lifestyle: Lifestyle
    dealbreakers: list[str]
    humor_style: str
    emotional_depth: str
    self_description: str
    partner_qualities: list[str]


class InterviewExchange(BaseModel):
    question: str
    answer: str
    dimension: str = "auto"


class InterviewData(BaseModel):
    exchanges: list[InterviewExchange] = []


class InterviewRequest(BaseModel):
    messages: list[dict]
    user_message: str


class InterviewResponse(BaseModel):
    message: str
    is_complete: bool


class ProfileGenerateResponse(BaseModel):
    personality: PersonalityData
    soul_md: str
