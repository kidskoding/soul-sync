import asyncio
from fastapi import APIRouter, Depends, BackgroundTasks
from app.deps import get_supabase, get_openai
from app.routers.auth import get_current_user_id
from app.services.conversation_orchestrator import (
    generate_twin_message,
    load_conversation_history,
    run_conversation_step,
)
from app.models.conversation import StartConversationRequest, StartConversationResponse

router = APIRouter()


async def run_conversation_loop(match_id: str):
    """Background task: run the full twin conversation with natural pacing."""
    from app.deps import get_supabase, get_openai
    sb = get_supabase()
    openai_client = get_openai()

    while True:
        result = run_conversation_step(sb, openai_client, match_id)
        if result.get("done"):
            # If completed successfully, trigger scoring
            if not result.get("error"):
                try:
                    from app.services.scoring_engine import run_scoring
                    run_scoring(sb, openai_client, match_id)
                except ImportError:
                    pass
            break
        await asyncio.sleep(2.5)  # Natural pacing between messages


@router.post("/start", response_model=StartConversationResponse)
async def start_conversation(
    req: StartConversationRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
):
    sb = get_supabase()
    openai_client = get_openai()

    # Verify match exists and user is part of it
    match = sb.table("matches").select("*").eq("id", req.match_id).single().execute()
    if not match.data:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Match not found")

    if user_id not in (match.data["user_a_id"], match.data["user_b_id"]):
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Not your match")

    # Load Twin A's profile
    profile_a = sb.table("soul_profiles").select("system_prompt").eq("user_id", match.data["user_a_id"]).single().execute()

    # Create session
    session = sb.table("conversation_sessions").insert({
        "match_id": req.match_id,
        "status": "active",
    }).execute()

    # Generate first message (Twin A opens)
    first_message = generate_twin_message(openai_client, profile_a.data["system_prompt"], [], "twin_a")

    # Write first message
    sb.table("conversations").insert({
        "match_id": req.match_id,
        "speaker": "twin_a",
        "message": first_message,
        "message_index": 0,
    }).execute()

    # Update session
    sb.table("conversation_sessions").update({
        "current_turn": 1,
        "status": "pending_next",
    }).eq("match_id", req.match_id).execute()

    # Update match status
    sb.table("matches").update({"status": "conversing"}).eq("id", req.match_id).execute()

    # Start background conversation loop
    background_tasks.add_task(run_conversation_loop, req.match_id)

    return StartConversationResponse(
        session_id=session.data[0]["id"] if session.data else "",
        first_message=first_message,
    )


@router.get("/{match_id}/messages")
async def get_messages(match_id: str, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    history = load_conversation_history(sb, match_id)
    return history


@router.get("/{match_id}/session")
async def get_session(match_id: str, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    session = sb.table("conversation_sessions").select("*").eq("match_id", match_id).single().execute()
    return session.data
