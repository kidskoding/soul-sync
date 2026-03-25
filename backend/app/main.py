from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, conversations, cron, interview, matching, photos, profile, scoring, swipes

app = FastAPI(title="SoulSync API", version="0.1.0")

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(interview.router, prefix="/api/interview", tags=["interview"])
app.include_router(profile.router, prefix="/api/profile", tags=["profile"])
app.include_router(matching.router, prefix="/api/matching", tags=["matching"])
app.include_router(photos.router, prefix="/api/photos", tags=["photos"])
app.include_router(swipes.router, prefix="/api/swipes", tags=["swipes"])
app.include_router(conversations.router, prefix="/api/conversations", tags=["conversations"])
app.include_router(scoring.router, prefix="/api/scoring", tags=["scoring"])
app.include_router(cron.router, prefix="/api/cron", tags=["cron"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok"}
