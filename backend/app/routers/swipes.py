"""Swipes router -- daily swipe feed and preference recording."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.deps import get_supabase
from app.routers.auth import get_current_user_id

router = APIRouter()


class SwipeRequest(BaseModel):
    target_id: str
    direction: str  # "right" | "left"


@router.get("/feed")
async def get_swipe_feed(user_id: str = Depends(get_current_user_id)):
    """Return 6 diverse profiles for daily swiping."""
    sb = get_supabase()

    # Get already-swiped user IDs
    swiped = (
        sb.table("swipes")
        .select("target_id")
        .eq("user_id", user_id)
        .execute()
    )
    swiped_ids = [s["target_id"] for s in (swiped.data or [])]
    swiped_ids.append(user_id)  # exclude self

    # Get profiles with completed onboarding, excluding already swiped
    result = (
        sb.table("users")
        .select("id, display_name, birth_year, avatar_url")
        .eq("onboarding_done", True)
        .not_.in_("id", swiped_ids)
        .limit(6)
        .execute()
    )

    # Enrich with interests from soul_profiles
    profiles = []
    for user in result.data or []:
        soul = (
            sb.table("soul_profiles")
            .select("personality")
            .eq("user_id", user["id"])
            .single()
            .execute()
        )
        interests: list[str] = []
        if soul.data and soul.data.get("personality"):
            interests = (
                soul.data["personality"]
                .get("lifestyle", {})
                .get("interests", [])
            )

        # Get first photo
        photo = (
            sb.table("user_photos")
            .select("url")
            .eq("user_id", user["id"])
            .order("position")
            .limit(1)
            .execute()
        )
        photo_url = photo.data[0]["url"] if photo.data else None

        profiles.append(
            {
                "id": user["id"],
                "display_name": user["display_name"],
                "birth_year": user["birth_year"],
                "photo_url": photo_url or user.get("avatar_url"),
                "interests": interests[:5],
            }
        )

    return profiles


@router.post("/")
async def record_swipe(
    req: SwipeRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Record a swipe as preference learning data."""
    if req.direction not in ("right", "left"):
        raise HTTPException(
            status_code=400, detail="Direction must be 'right' or 'left'"
        )

    sb = get_supabase()
    sb.table("swipes").upsert(
        {
            "user_id": user_id,
            "target_id": req.target_id,
            "direction": req.direction,
        },
        on_conflict="user_id,target_id",
    ).execute()

    return {"recorded": True}


@router.get("/stats")
async def get_swipe_stats(user_id: str = Depends(get_current_user_id)):
    """Get total swipe count for the authenticated user."""
    sb = get_supabase()
    result = (
        sb.table("swipes")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .execute()
    )
    return {"total_swipes": result.count or 0}
