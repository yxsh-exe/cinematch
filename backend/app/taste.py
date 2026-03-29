"""taste.py — Update user's persistent taste vector on interactions."""

from sqlalchemy.ext.asyncio import AsyncSession
from app.db_models import User
from app import recommender


async def update_user_taste(db: AsyncSession, user: User, movie_title: str, learning_rate: float = 0.1):
    """Blend a movie into the user's taste_vector and persist it."""
    try:
        movie_index = recommender._find_movie_index(movie_title)
    except ValueError:
        return

    user.taste_vector = recommender.update_taste_profile(
        current_vector_json=user.taste_vector,
        movie_index=movie_index,
        learning_rate=learning_rate,
    )
    await db.commit()
