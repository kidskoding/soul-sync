"""Compatibility scoring engine using Claude structured output."""

import json

from anthropic import Anthropic
from supabase import Client

SCORING_SYSTEM = """You are a relationship compatibility analyst. Analyze this conversation between two potential partners and score their compatibility across five dimensions.

Score each dimension 0-100 based on evidence from the conversation:
- values_alignment: Do they share core beliefs, priorities, and life goals?
- communication_style: Do their communication patterns mesh? Same wavelength?
- humor_compatibility: Do they make each other laugh? Compatible humor?
- lifestyle_fit: Do their daily lives, energy levels, and interests align?
- emotional_depth: Is there genuine connection? Beyond surface-level?

Be rigorous. 50 = neutral/insufficient evidence. Only score above 75 if conversation shows clear, strong compatibility. Provide a brief 2-3 sentence analysis."""

SCORING_SCHEMA = {
    "type": "object",
    "properties": {
        "values_alignment": {"type": "number"},
        "communication_style": {"type": "number"},
        "humor_compatibility": {"type": "number"},
        "lifestyle_fit": {"type": "number"},
        "emotional_depth": {"type": "number"},
        "analysis": {"type": "string"},
    },
    "required": [
        "values_alignment",
        "communication_style",
        "humor_compatibility",
        "lifestyle_fit",
        "emotional_depth",
        "analysis",
    ],
    "additionalProperties": False,
}

WEIGHTS = {
    "values_alignment": 0.30,
    "communication_style": 0.25,
    "humor_compatibility": 0.15,
    "lifestyle_fit": 0.15,
    "emotional_depth": 0.15,
}

MATCH_THRESHOLD = 72


def compute_overall(scores: dict) -> float:
    """Compute weighted overall compatibility score."""
    return round(
        scores["values_alignment"] * WEIGHTS["values_alignment"]
        + scores["communication_style"] * WEIGHTS["communication_style"]
        + scores["humor_compatibility"] * WEIGHTS["humor_compatibility"]
        + scores["lifestyle_fit"] * WEIGHTS["lifestyle_fit"]
        + scores["emotional_depth"] * WEIGHTS["emotional_depth"]
    )


def format_transcript(messages: list[dict]) -> str:
    """Format conversation messages into a readable transcript."""
    return "\n".join(
        f"{'Person A' if m['speaker'] == 'twin_a' else 'Person B'}: {m['message']}"
        for m in messages
    )


def run_scoring(sb: Client, anthropic_client: Anthropic, match_id: str) -> dict:
    """Score a completed conversation between two digital twins.

    Loads the conversation transcript and both twin profiles, sends them to
    Claude for multi-dimensional compatibility analysis, persists the scores,
    and updates the match status based on the threshold.
    """
    # Load conversation messages
    messages = (
        sb.table("conversations")
        .select("*")
        .eq("match_id", match_id)
        .order("message_index")
        .execute()
    )
    if not messages.data:
        return {"error": "No messages found"}

    # Load match record and both profiles for context
    match = sb.table("matches").select("*").eq("id", match_id).single().execute()
    profile_a = (
        sb.table("soul_profiles")
        .select("system_prompt")
        .eq("user_id", match.data["user_a_id"])
        .single()
        .execute()
    )
    profile_b = (
        sb.table("soul_profiles")
        .select("system_prompt")
        .eq("user_id", match.data["user_b_id"])
        .single()
        .execute()
    )

    transcript = format_transcript(messages.data)

    prompt = (
        f"Twin A personality:\n{profile_a.data['system_prompt']}\n\n"
        f"Twin B personality:\n{profile_b.data['system_prompt']}\n\n"
        f"Conversation:\n{transcript}"
    )

    response = anthropic_client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        system=SCORING_SYSTEM,
        messages=[{"role": "user", "content": prompt}],
        output_config={
            "format": {"type": "json_schema", "schema": SCORING_SCHEMA},
        },
    )

    text = response.content[0].text if response.content[0].type == "text" else "{}"
    scores = json.loads(text)

    overall = compute_overall(scores)

    # Persist scores (upsert on match_id)
    sb.table("compatibility_scores").upsert(
        {
            "match_id": match_id,
            "values_alignment": scores["values_alignment"],
            "communication_style": scores["communication_style"],
            "humor_compatibility": scores["humor_compatibility"],
            "lifestyle_fit": scores["lifestyle_fit"],
            "emotional_depth": scores["emotional_depth"],
            "overall": overall,
            "analysis": scores.get("analysis"),
        },
        on_conflict="match_id",
    ).execute()

    # Update match status based on threshold
    new_status = "revealed" if overall >= MATCH_THRESHOLD else "scored"
    sb.table("matches").update({"status": new_status}).eq("id", match_id).execute()

    return {**scores, "overall": overall, "status": new_status}
