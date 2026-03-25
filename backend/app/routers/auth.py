"""Authentication router — JWT verification via Supabase."""

from fastapi import APIRouter, Depends, HTTPException, Header

from app.deps import get_supabase

router = APIRouter()


async def get_current_user_id(authorization: str = Header(...)) -> str:
    """Extract and verify user ID from Supabase JWT token."""
    token = authorization.replace("Bearer ", "")
    sb = get_supabase()
    try:
        user = sb.auth.get_user(token)
        if not user or not user.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.get("/me")
async def get_me(user_id: str = Depends(get_current_user_id)):
    """Return the authenticated user's profile from the users table."""
    sb = get_supabase()
    result = sb.table("users").select("*").eq("id", user_id).single().execute()
    return result.data
