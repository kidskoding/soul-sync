"""Interview router — handles the onboarding chat conversation.

The frontend sends the full message history plus the latest user message.
The engine returns the next interviewer response and a flag indicating
whether the interview is complete.  When complete, the conversation
exchanges are persisted to the soul_profiles table.
"""

from fastapi import APIRouter, Depends

from app.deps import get_anthropic, get_supabase
from app.models.soul import InterviewRequest, InterviewResponse
from app.routers.auth import get_current_user_id
from app.services.interview_engine import get_interview_response

router = APIRouter()


@router.post("/chat", response_model=InterviewResponse)
async def chat(
    req: InterviewRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Process a single turn of the onboarding interview.

    Appends the user's latest message to the conversation history,
    generates the interviewer's next response via Claude, and — when the
    interview is complete — saves the full exchange to the database.
    """
    client = get_anthropic()
    full_messages = [*req.messages, {"role": "user", "content": req.user_message}]

    text, is_complete = get_interview_response(client, full_messages)

    if is_complete:
        sb = get_supabase()
        # Build exchange data from conversation.
        # Messages alternate: user, assistant, user, assistant, ...
        # We pair each assistant question with the following user answer.
        exchanges = []
        for i in range(0, len(full_messages), 2):
            q = full_messages[i]["content"] if i < len(full_messages) else ""
            a = full_messages[i + 1]["content"] if i + 1 < len(full_messages) else ""
            if a:  # Only add if there's an answer
                exchanges.append({"question": q, "answer": a, "dimension": "auto"})

        sb.table("soul_profiles").upsert(
            {
                "user_id": user_id,
                "interview_data": {"exchanges": exchanges},
            },
            on_conflict="user_id",
        ).execute()

    return InterviewResponse(message=text, is_complete=is_complete)
