"""Conversation reflection agent that analyzes completed conversations
and updates SOUL.MD learnings for future match improvement."""

import json

from openai import OpenAI
from supabase import Client


REFLECTION_SYSTEM = """You are analyzing a completed dating conversation to extract learnings for future matches. The conversation has already been scored.

Based on the conversation transcript and compatibility scores, identify:
1. What topics resonated well (led to engagement)?
2. What communication approaches worked?
3. What patterns emerged in failed/stalled conversations?

Return JSON with learnings to improve future conversations."""

REFLECTION_SCHEMA = {
    "type": "object",
    "properties": {
        "successful_topics": {"type": "array", "items": {"type": "string"}},
        "effective_approaches": {"type": "array", "items": {"type": "string"}},
        "failure_patterns": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["successful_topics", "effective_approaches", "failure_patterns"],
    "additionalProperties": False,
}


def reflect_on_conversation(
    sb: Client, openai_client: OpenAI, match_id: str, user_id: str
) -> dict:
    """Analyze a completed conversation and update SOUL.MD learnings."""
    # Load conversation
    messages = (
        sb.table("conversations")
        .select("speaker, message")
        .eq("match_id", match_id)
        .order("message_index")
        .execute()
    )
    if not messages.data:
        return {"error": "No messages"}

    # Load scores
    scores = (
        sb.table("compatibility_scores")
        .select("*")
        .eq("match_id", match_id)
        .single()
        .execute()
    )

    transcript = "\n".join(
        f"{'Person A' if m['speaker'] == 'twin_a' else 'Person B'}: {m['message']}"
        for m in messages.data
    )

    score_summary = ""
    if scores.data:
        score_summary = (
            f"\n\nScores: overall={scores.data['overall']}, "
            f"values={scores.data['values_alignment']}, "
            f"communication={scores.data['communication_style']}, "
            f"humor={scores.data['humor_compatibility']}"
        )

    response = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=500,
        messages=[
            {"role": "system", "content": REFLECTION_SYSTEM},
            {"role": "user", "content": f"{transcript}{score_summary}"},
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "conversation_reflection",
                "schema": REFLECTION_SCHEMA,
                "strict": True,
            },
        },
    )

    text = response.choices[0].message.content or "{}"
    new_learnings = json.loads(text)

    # Merge with existing learnings
    profile = (
        sb.table("soul_profiles")
        .select("learnings")
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    existing = profile.data.get("learnings", {}) if profile.data else {}

    merged = {
        "successful_topics": list(
            set(
                existing.get("successful_topics", [])
                + new_learnings.get("successful_topics", [])
            )
        )[-20:],
        "effective_approaches": list(
            set(
                existing.get("effective_approaches", [])
                + new_learnings.get("effective_approaches", [])
            )
        )[-10:],
        "failure_patterns": list(
            set(
                existing.get("failure_patterns", [])
                + new_learnings.get("failure_patterns", [])
            )
        )[-10:],
    }

    sb.table("soul_profiles").update({"learnings": merged}).eq(
        "user_id", user_id
    ).execute()

    return new_learnings
