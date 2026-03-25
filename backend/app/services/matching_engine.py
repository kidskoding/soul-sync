"""Multi-stage matching pipeline: embedding similarity + lite LLM validation."""

import json

from openai import OpenAI
from supabase import Client


def find_candidates_by_embedding(sb: Client, user_id: str, limit: int = 50) -> list[dict]:
    """Stage 1: Find similar profiles via pgvector cosine similarity."""
    profile = (
        sb.table("soul_profiles")
        .select("embedding")
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not profile.data or not profile.data.get("embedding"):
        return []

    result = sb.rpc(
        "match_personalities",
        {
            "query_embedding": profile.data["embedding"],
            "match_threshold": 0.6,
            "match_count": limit,
            "exclude_user_id": user_id,
        },
    ).execute()

    return result.data or []


def validate_with_lite_llm(
    client: OpenAI, soul_md_a: str, soul_md_b: str
) -> dict:
    """Stage 2: Lite LLM quick-check for dealbreaker conflicts."""
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=300,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a compatibility pre-screener. Given two dating profiles, "
                    "decide if they're worth a full conversation. Check for dealbreaker "
                    "conflicts, major lifestyle mismatches, and obvious incompatibilities. "
                    "Be quick and decisive."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Profile A:\n{soul_md_a}\n\n"
                    f"Profile B:\n{soul_md_b}\n\n"
                    "Are these two worth a full conversation? "
                    'Respond with JSON: {"pass": true/false, "reason": "one sentence"}'
                ),
            },
        ],
        response_format={"type": "json_object"},
    )

    text = response.choices[0].message.content or '{"pass": false, "reason": "error"}'
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {"pass": True, "reason": "parse error, defaulting to pass"}


def run_matching_pipeline(
    sb: Client, openai_client: OpenAI, user_id: str
) -> list[dict]:
    """Run full matching pipeline: embedding -> lite LLM -> match records."""
    # Stage 1: embedding similarity search
    candidates = find_candidates_by_embedding(sb, user_id)
    if not candidates:
        return []

    # Load user's SOUL.MD
    user_profile = (
        sb.table("soul_profiles")
        .select("soul_md")
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not user_profile.data:
        return []

    user_soul_md = user_profile.data["soul_md"]
    validated = []

    # Stage 2: validate top 20 candidates with lite LLM
    for candidate in candidates[:20]:
        cand_profile = (
            sb.table("soul_profiles")
            .select("soul_md")
            .eq("user_id", candidate["user_id"])
            .single()
            .execute()
        )
        if not cand_profile.data:
            continue

        result = validate_with_lite_llm(
            openai_client, user_soul_md, cand_profile.data["soul_md"]
        )

        # Record candidate evaluation
        sb.table("match_candidates").insert(
            {
                "user_a_id": user_id,
                "user_b_id": candidate["user_id"],
                "stage": "llm_validated" if result.get("pass") else "embedding",
                "embedding_sim": candidate["similarity"],
                "llm_pass": result.get("pass", False),
            }
        ).execute()

        if result.get("pass"):
            validated.append(candidate)

    return validated
