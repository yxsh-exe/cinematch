"""routers/ratings.py — CRUD endpoints for user movie ratings."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.db_models import User, Movie, Rating
from app.auth import get_current_user
from app.schemas import RatingCreate, RatingResponse
from app import recommender
from app.taste import update_user_taste

router = APIRouter(prefix="/api/ratings", tags=["Ratings"])


@router.post("/", response_model=RatingResponse, status_code=status.HTTP_201_CREATED)
async def create_rating(
    rating_data: RatingCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Rate a movie (score 1-10). Use PUT to update an existing rating."""
    result = await db.execute(select(Movie).where(Movie.movie_id == rating_data.movie_id))
    movie = result.scalar_one_or_none()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    result = await db.execute(
        select(Rating).where(Rating.user_id == current_user.user_id, Rating.movie_id == rating_data.movie_id)
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You have already rated this movie. Use PUT to update.")

    new_rating = Rating(user_id=current_user.user_id, movie_id=rating_data.movie_id, score=rating_data.score)
    db.add(new_rating)
    await db.commit()
    await db.refresh(new_rating)

    await update_user_taste(db, current_user, movie.title, learning_rate=0.15)

    return RatingResponse(
        rating_id=new_rating.rating_id, user_id=new_rating.user_id,
        movie_id=new_rating.movie_id, movie_title=movie.title,
        score=new_rating.score, timestamp=new_rating.timestamp,
    )


@router.get("/", response_model=list[RatingResponse])
async def get_my_ratings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all movies rated by the current user."""
    result = await db.execute(
        select(Rating, Movie.title)
        .join(Movie, Rating.movie_id == Movie.movie_id)
        .where(Rating.user_id == current_user.user_id)
        .order_by(Rating.timestamp.desc())
    )
    return [
        RatingResponse(
            rating_id=rating.rating_id, user_id=rating.user_id,
            movie_id=rating.movie_id, movie_title=title, title=title,
            poster_url=recommender.get_poster_url(title),
            score=rating.score, timestamp=rating.timestamp,
        )
        for rating, title in result.all()
    ]


@router.put("/{movie_id}", response_model=RatingResponse)
async def update_rating(
    movie_id: int,
    rating_data: RatingCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update your rating for a specific movie."""
    result = await db.execute(
        select(Rating).where(Rating.user_id == current_user.user_id, Rating.movie_id == movie_id)
    )
    rating = result.scalar_one_or_none()
    if not rating:
        raise HTTPException(status_code=404, detail="Rating not found for this movie")

    rating.score = rating_data.score
    await db.commit()
    await db.refresh(rating)

    movie_result = await db.execute(select(Movie.title).where(Movie.movie_id == movie_id))
    movie_title = movie_result.scalar_one_or_none()
    if movie_title:
        await update_user_taste(db, current_user, movie_title, learning_rate=0.15)

    return RatingResponse(
        rating_id=rating.rating_id, user_id=rating.user_id,
        movie_id=rating.movie_id, movie_title=movie_title,
        score=rating.score, timestamp=rating.timestamp,
    )


@router.delete("/{movie_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rating(
    movie_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove your rating for a specific movie."""
    result = await db.execute(
        select(Rating).where(Rating.user_id == current_user.user_id, Rating.movie_id == movie_id)
    )
    rating = result.scalar_one_or_none()
    if not rating:
        raise HTTPException(status_code=404, detail="Rating not found for this movie")

    await db.delete(rating)
    await db.commit()
