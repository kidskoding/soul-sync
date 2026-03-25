"""Scoring router — trigger and retrieve compatibility scores."""

from fastapi import APIRouter, Depends

from app.deps import get_anthropic, get_supabase
from app.routers.auth import get_current_user_id
from app.services.scoring_engine import run_scoring

router = APIRouter()


@router.post("/{match_id}")
async def score_match(match_id: str, user_id: str = Depends(get_current_user_id)):
    """Trigger compatibility scoring for a completed conversation."""
    sb = get_supabase()
    anthropic_client = get_anthropic()
    result = run_scoring(sb, anthropic_client, match_id)
    return result


@router.get("/{match_id}")
async def get_scores(match_id: str, user_id: str = Depends(get_current_user_id)):
    """Retrieve stored compatibility scores for a match."""
    sb = get_supabase()
    result = (
        sb.table("compatibility_scores")
        .select("*")
        .eq("match_id", match_id)
        .single()
        .execute()
    )
    return result.data
