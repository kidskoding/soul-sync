"""Profile router — triggers SOUL.MD generation after the interview."""

from fastapi import APIRouter, Depends, HTTPException

from app.deps import get_anthropic, get_openai, get_supabase
from app.routers.auth import get_current_user_id
from app.services.soul_generator import generate_full_soul_profile

router = APIRouter()


@router.post("/generate")
async def generate_profile(user_id: str = Depends(get_current_user_id)):
    """Generate the full soul profile from completed interview data.

    Loads the interview exchanges from the database, runs the SOUL.MD
    generation pipeline (personality extraction, document generation,
    system prompt creation, embedding), saves everything back to the
    database, and marks onboarding as complete.
    """
    sb = get_supabase()

    # Load interview data
    result = (
        sb.table("soul_profiles")
        .select("interview_data")
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not result.data or not result.data.get("interview_data"):
        raise HTTPException(status_code=400, detail="No interview data found")

    # Load user name
    user_result = (
        sb.table("users")
        .select("display_name")
        .eq("id", user_id)
        .single()
        .execute()
    )
    name = (
        user_result.data.get("display_name", "User") if user_result.data else "User"
    )

    # Run full pipeline
    anthropic_client = get_anthropic()
    openai_client = get_openai()
    profile = generate_full_soul_profile(
        anthropic_client, openai_client, name, result.data["interview_data"]
    )

    # Save to DB
    sb.table("soul_profiles").update(
        {
            "personality": profile["personality"],
            "soul_md": profile["soul_md"],
            "system_prompt": profile["system_prompt"],
            "embedding": profile["embedding"],
            "updated_at": "now()",
        }
    ).eq("user_id", user_id).execute()

    # Mark onboarding complete
    sb.table("users").update({"onboarding_done": True}).eq("id", user_id).execute()

    return {
        "personality": profile["personality"],
        "soul_md": profile["soul_md"],
    }
