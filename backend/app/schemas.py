"""schemas.py — Pydantic schemas for auth, ratings, and watchlist requests/responses."""

from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field


class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    user_id: UUID
    username: str
    email: str
    created_at: datetime
    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class RatingCreate(BaseModel):
    movie_id: int
    score: float = Field(..., ge=1, le=10)


class RatingResponse(BaseModel):
    rating_id: int
    user_id: UUID
    movie_id: int
    movie_title: str | None = None
    title: str | None = None
    poster_url: str | None = None
    score: float
    timestamp: datetime
    model_config = {"from_attributes": True}


class WatchlistCreate(BaseModel):
    movie_id: int
    status: str = Field(default="want_to_watch", pattern="^(want_to_watch|watching|watched)$")


class WatchlistUpdate(BaseModel):
    status: str = Field(..., pattern="^(want_to_watch|watching|watched)$")


class WatchlistResponse(BaseModel):
    entry_id: int
    user_id: UUID
    movie_id: int
    movie_title: str | None = None
    title: str | None = None
    poster_url: str | None = None
    added_date: datetime
    status: str
    model_config = {"from_attributes": True}
