from datetime import datetime

from pydantic import BaseModel


class ConversationMessage(BaseModel):
    id: str
    match_id: str
    speaker: str
    message: str
    message_index: int
    created_at: datetime


class ConversationSession(BaseModel):
    id: str
    match_id: str
    status: str
    current_turn: int
    max_turns: int = 20
    retry_count: int = 0


class StartConversationRequest(BaseModel):
    match_id: str


class StartConversationResponse(BaseModel):
    session_id: str
    first_message: str
