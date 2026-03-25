"""Photo upload router -- Supabase Storage + user_photos table."""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from app.deps import get_supabase
from app.routers.auth import get_current_user_id

import uuid
import time

router = APIRouter()


@router.post("/upload")
async def upload_photo(
    photo: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
):
    """Upload a photo to Supabase Storage and record it in user_photos."""
    sb = get_supabase()

    ext = photo.filename.split(".")[-1] if photo.filename else "jpg"
    path = f"{user_id}/{int(time.time())}_{uuid.uuid4().hex[:8]}.{ext}"

    content = await photo.read()

    sb.storage.from_("photos").upload(
        path, content, {"content-type": photo.content_type or "image/jpeg"}
    )

    public_url = sb.storage.from_("photos").get_public_url(path)

    # Get current photo count for position
    count_result = (
        sb.table("user_photos")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .execute()
    )
    position = count_result.count or 0

    sb.table("user_photos").insert(
        {
            "user_id": user_id,
            "url": public_url,
            "position": position,
        }
    ).execute()

    return {"url": public_url, "position": position}


@router.get("/")
async def get_photos(user_id: str = Depends(get_current_user_id)):
    """Return all photos for the authenticated user, ordered by position."""
    sb = get_supabase()
    result = (
        sb.table("user_photos")
        .select("*")
        .eq("user_id", user_id)
        .order("position")
        .execute()
    )
    return result.data


@router.delete("/{photo_id}")
async def delete_photo(
    photo_id: str, user_id: str = Depends(get_current_user_id)
):
    """Delete a photo by ID (only if owned by the authenticated user)."""
    sb = get_supabase()
    sb.table("user_photos").delete().eq("id", photo_id).eq(
        "user_id", user_id
    ).execute()
    return {"deleted": True}
