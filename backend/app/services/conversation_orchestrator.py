import asyncio
import json
from openai import OpenAI
from supabase import Client

from app.services.conversation_monitor import evaluate_conversation, should_check


CONVERSATION_CONTEXT = """You are having a getting-to-know-you conversation with someone new. Be authentic to your personality. Explore values, interests, humor, and what matters in a partner. Keep responses conversational — 2-4 sentences, natural length."""


def generate_twin_message(
    client: OpenAI,
    system_prompt: str,
    history: list[dict],
    speaker: str,
) -> str:
    """Generate one twin message."""
    messages = [{"role": "system", "content": f"{system_prompt}\n\n{CONVERSATION_CONTEXT}"}]

    for msg in history:
        role = "assistant" if msg["speaker"] == speaker else "user"
        messages.append({"role": role, "content": msg["message"]})

    if len(messages) == 1:  # Only system message, no history
        messages.append({"role": "user", "content": "Say hi and introduce yourself naturally."})

    response = client.chat.completions.create(
        model="gpt-4o",
        max_tokens=300,
        messages=messages,
    )

    return response.choices[0].message.content or ""


def load_conversation_history(sb: Client, match_id: str) -> list[dict]:
    """Load all messages for a match, ordered by index."""
    result = sb.table("conversations").select("*").eq("match_id", match_id).order("message_index").execute()
    return result.data or []


def run_conversation_step(
    sb: Client, openai_client: OpenAI, match_id: str
) -> dict:
    """Run one exchange in the conversation. Returns {"done": bool, "turn": int}."""
    # Load session
    session = sb.table("conversation_sessions").select("*").eq("match_id", match_id).single().execute()
    if not session.data:
        return {"done": True, "error": "No session found"}

    sess = session.data
    if sess["status"] not in ("active", "pending_next"):
        return {"done": True, "error": f"Session status: {sess['status']}"}

    # Mark active to prevent double-trigger
    sb.table("conversation_sessions").update({"status": "active"}).eq("id", sess["id"]).execute()

    try:
        # Load match
        match = sb.table("matches").select("*").eq("id", match_id).single().execute()
        if not match.data:
            raise Exception("Match not found")

        # Determine speaker
        speaker = "twin_a" if sess["current_turn"] % 2 == 0 else "twin_b"
        user_id = match.data["user_a_id"] if speaker == "twin_a" else match.data["user_b_id"]

        # Load system prompt
        profile = sb.table("soul_profiles").select("system_prompt").eq("user_id", user_id).single().execute()
        if not profile.data:
            raise Exception("Profile not found")

        # Load history and generate message
        history = load_conversation_history(sb, match_id)
        message = generate_twin_message(openai_client, profile.data["system_prompt"], history, speaker)

        # Write message (triggers Supabase Realtime)
        sb.table("conversations").insert({
            "match_id": match_id,
            "speaker": speaker,
            "message": message,
            "message_index": sess["current_turn"],
        }).execute()

        new_turn = sess["current_turn"] + 1
        is_done = new_turn >= sess["max_turns"]

        # Monitor check every 5 messages
        if should_check(new_turn):
            all_messages = load_conversation_history(sb, match_id)
            eval_result = evaluate_conversation(openai_client, all_messages)

            if eval_result.get("recommendation") in (
                "escalate_to_meetup",
                "end_low_compatibility",
                "end_stalled",
            ):
                is_done = True

        sb.table("conversation_sessions").update({
            "current_turn": new_turn,
            "status": "completed" if is_done else "pending_next",
            "completed_at": "now()" if is_done else None,
            "retry_count": 0,
        }).eq("id", sess["id"]).execute()

        return {"done": is_done, "turn": new_turn, "speaker": speaker}

    except Exception as e:
        new_retry = (sess.get("retry_count") or 0) + 1
        sb.table("conversation_sessions").update({
            "status": "failed" if new_retry >= 3 else "pending_next",
            "retry_count": new_retry,
        }).eq("id", sess["id"]).execute()
        return {"done": True, "error": str(e)}
