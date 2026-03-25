"""Matching router -- triggers the multi-stage matching pipeline."""

from fastapi import APIRouter, Depends

from app.deps import get_supabase, get_openai
from app.routers.auth import get_current_user_id
from app.services.matching_engine import run_matching_pipeline

router = APIRouter()


@router.post("/run")
async def run_matching(user_id: str = Depends(get_current_user_id)):
    """Run the matching pipeline for the authenticated user."""
    sb = get_supabase()
    openai_client = get_openai()

    validated = run_matching_pipeline(sb, openai_client, user_id)

    # Create match records for top 5 validated candidates
    for candidate in validated[:5]:
        sb.table("matches").upsert(
            {
                "user_a_id": user_id,
                "user_b_id": candidate["user_id"],
                "similarity": candidate["similarity"],
                "status": "pending",
            },
            on_conflict="user_a_id,user_b_id",
        ).execute()

    return {
        "matches_found": len(validated),
        "conversations_queued": min(len(validated), 5),
    }
