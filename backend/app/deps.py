"""Dependency injection helpers for FastAPI routes."""

from anthropic import Anthropic
from openai import OpenAI
from supabase import Client, create_client

from app.config import settings


def get_supabase() -> Client:
    """Return a Supabase client using the service-role key."""
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def get_anthropic() -> Anthropic:
    """Return an Anthropic client."""
    return Anthropic(api_key=settings.anthropic_api_key)


def get_openai() -> OpenAI:
    """Return an OpenAI client."""
    return OpenAI(api_key=settings.openai_api_key)
