"""Swipe analysis service.

Processes a user's swipe history to identify preference patterns,
updates their SOUL.MD preferences, and re-generates the personality
embedding so future matches reflect learned tastes.
"""

import json

from openai import OpenAI
from supabase import Client

ANALYSIS_SYSTEM = """Analyze this user's dating swipe patterns. They swiped right (liked) and left (passed) on various profiles. Identify patterns:

1. What do the right-swiped profiles have in common?
2. What do the left-swiped profiles have in common?
3. What preferences can we infer?

Return a JSON object with:
- physical_preferences: list of observed physical/appearance preferences
- personality_preferences: list of personality traits they seem attracted to
- refined_dealbreakers: any dealbreakers that emerged from left-swipes
- patterns: list of other notable patterns"""

ANALYSIS_SCHEMA = {
    "type": "object",
    "properties": {
        "physical_preferences": {"type": "array", "items": {"type": "string"}},
        "personality_preferences": {"type": "array", "items": {"type": "string"}},
        "refined_dealbreakers": {"type": "array", "items": {"type": "string"}},
        "patterns": {"type": "array", "items": {"type": "string"}},
    },
    "required": [
        "physical_preferences",
        "personality_preferences",
        "refined_dealbreakers",
        "patterns",
    ],
    "additionalProperties": False,
}


def analyze_swipes(
    sb: Client, openai_client: OpenAI, user_id: str
) -> dict:
    """Analyze a user's swipe history and update their SOUL.MD preferences."""
    # Load swipes
    swipes = (
        sb.table("swipes")
        .select("target_id, direction")
        .eq("user_id", user_id)
        .execute()
    )
    if not swipes.data or len(swipes.data) < 3:
        return {"skipped": True, "reason": "Not enough swipes"}

    # Load target profiles and bucket by swipe direction
    right_profiles: list[str] = []
    left_profiles: list[str] = []
    for swipe in swipes.data:
        profile = (
            sb.table("soul_profiles")
            .select("personality, soul_md")
            .eq("user_id", swipe["target_id"])
            .single()
            .execute()
        )
        if not profile.data:
            continue
        summary = profile.data.get("soul_md", "")[:500]  # truncate for token efficiency
        if swipe["direction"] == "right":
            right_profiles.append(summary)
        else:
            left_profiles.append(summary)

    prompt = "RIGHT SWIPES (liked):\n" + "\n---\n".join(right_profiles[:10])
    prompt += "\n\nLEFT SWIPES (passed):\n" + "\n---\n".join(left_profiles[:10])

    response = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=1000,
        messages=[
            {"role": "system", "content": ANALYSIS_SYSTEM},
            {"role": "user", "content": prompt},
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "swipe_analysis",
                "schema": ANALYSIS_SCHEMA,
                "strict": True,
            },
        },
    )

    text = response.choices[0].message.content or "{}"
    preferences = json.loads(text)

    # Update SOUL.MD preferences
    sb.table("soul_profiles").update(
        {"preferences": preferences}
    ).eq("user_id", user_id).execute()

    # Re-generate embedding with updated preferences
    from app.services.soul_generator import (
        generate_embedding,
        personality_to_embedding_text,
    )

    profile = (
        sb.table("soul_profiles")
        .select("personality, version")
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if profile.data and profile.data.get("personality"):
        base_text = personality_to_embedding_text(profile.data["personality"])
        pref_text = (
            f" Preferences: {', '.join(preferences.get('personality_preferences', []))}."
        )
        new_embedding = generate_embedding(openai_client, base_text + pref_text)
        current_version = profile.data.get("version", 1) or 1
        sb.table("soul_profiles").update(
            {
                "embedding": new_embedding,
                "version": current_version + 1,
            }
        ).eq("user_id", user_id).execute()

    return preferences


def run_batch_analysis(
    sb: Client, openai_client: OpenAI
) -> list[dict]:
    """Run swipe analysis for all users with sufficient swipe data."""
    users = (
        sb.table("users").select("id").eq("onboarding_done", True).execute()
    )
    results = []
    for user in users.data or []:
        result = analyze_swipes(sb, openai_client, user["id"])
        results.append({"user_id": user["id"], **result})
    return results
