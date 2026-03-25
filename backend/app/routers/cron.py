"""Cron / scheduled-job endpoints.

Protected by a webhook secret header so only trusted callers
(e.g. Railway cron, GitHub Actions) can trigger batch work.
"""

from fastapi import APIRouter, Header, HTTPException

from app.config import settings
from app.deps import get_openai, get_supabase
from app.services.swipe_analyzer import run_batch_analysis

router = APIRouter()


@router.post("/analyze-swipes")
async def analyze_swipes_cron(x_webhook_secret: str = Header(default="")):
    """Nightly batch job to analyze swipe patterns. Protected by webhook secret."""
    if x_webhook_secret != settings.webhook_secret:
        raise HTTPException(status_code=401, detail="Invalid secret")

    sb = get_supabase()
    openai_client = get_openai()
    results = run_batch_analysis(sb, openai_client)
    return {"processed": len(results), "results": results}
