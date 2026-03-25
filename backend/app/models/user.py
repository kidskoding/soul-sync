from pydantic import BaseModel


class User(BaseModel):
    id: str
    email: str
    display_name: str | None = None
    birth_year: int | None = None
    avatar_url: str | None = None
    onboarding_done: bool = False


class UserCreate(BaseModel):
    email: str
    display_name: str | None = None
    birth_year: int | None = None
