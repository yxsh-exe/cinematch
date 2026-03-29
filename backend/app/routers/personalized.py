"""routers/personalized.py — Personalized 'For You' recommendations."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.db_models import User, Movie, Rating, WatchlistEntry, SearchHistory
from app.auth import get_current_user
from app import recommender
from app.models import PersonalizedResponse, PersonalizedMovie

router = APIRouter(prefix="/api/personalized", tags=["Personalized"])


def _title_to_df_index(title: str) -> int | None:
    """Map movie title to DataFrame index."""
    try:
        return recommender._find_movie_index(title)
    except ValueError:
        return None


def _tmdb_id_to_df_index(tmdb_id: int) -> int | None:
    """Map TMDB ID to DataFrame index."""
    matches = recommender._movies_df[recommender._movies_df["movie_id"] == tmdb_id]
    return matches.index[0] if len(matches) > 0 else None


@router.get("/for-you", response_model=PersonalizedResponse)
async def get_for_you(
    n: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get personalized recommendations based on taste vector or interaction history."""
    seen_indices = set()
    movie_indices = []
    ratings_map = {}

    result = await db.execute(
        select(Rating, Movie.tmdb_id)
        .join(Movie, Rating.movie_id == Movie.movie_id)
        .where(Rating.user_id == current_user.user_id)
    )
    for rating, tmdb_id in result.all():
        idx = _tmdb_id_to_df_index(tmdb_id)
        if idx is not None and idx not in seen_indices:
            movie_indices.append(idx)
            ratings_map[idx] = rating.score
            seen_indices.add(idx)

    result = await db.execute(
        select(WatchlistEntry, Movie.tmdb_id)
        .join(Movie, WatchlistEntry.movie_id == Movie.movie_id)
        .where(WatchlistEntry.user_id == current_user.user_id)
    )
    for entry, tmdb_id in result.all():
        idx = _tmdb_id_to_df_index(tmdb_id)
        if idx is not None and idx not in seen_indices:
            movie_indices.append(idx)
            ratings_map[idx] = 7.0
            seen_indices.add(idx)

    result = await db.execute(
        select(SearchHistory)
        .where(SearchHistory.user_id == current_user.user_id, SearchHistory.event_type == "view")
        .order_by(SearchHistory.timestamp.desc())
        .limit(50)
    )
    for event in result.scalars().all():
        idx = _title_to_df_index(event.query)
        if idx is not None and idx not in seen_indices:
            movie_indices.append(idx)
            ratings_map[idx] = 5.0
            seen_indices.add(idx)

    if current_user.taste_vector:
        results = recommender.recommend_from_profile(
            taste_vector_json=current_user.taste_vector,
            exclude_indices=seen_indices,
            n=n,
        )
        return PersonalizedResponse(
            recommendations=[PersonalizedMovie(**r) for r in results],
            based_on_count=len(seen_indices),
        )

    if not movie_indices:
        popular = recommender._movies_df.nlargest(n, "popularity")
        results = [recommender._movie_to_dict(idx) for idx in popular.index]
        for r in results:
            r["relevance_score"] = round(r["popularity"] / 100, 4)
        return PersonalizedResponse(
            recommendations=[PersonalizedMovie(**r) for r in results[:n]],
            based_on_count=0,
        )

    results = recommender.get_personalized_recommendations(
        movie_indices=movie_indices, ratings_map=ratings_map, n=n,
    )

    import json, numpy as np
    vectors = []
    weights = []
    for idx in movie_indices:
        if 0 <= idx < recommender._tfidf_matrix.shape[0]:
            vectors.append(recommender._tfidf_matrix[idx].toarray()[0])
            weights.append(ratings_map.get(idx, 5.0) / 10.0)
    if vectors:
        profile = np.average(np.array(vectors), axis=0, weights=weights)
        current_user.taste_vector = json.dumps(profile.tolist())
        await db.commit()

    return PersonalizedResponse(
        recommendations=[PersonalizedMovie(**r) for r in results],
        based_on_count=len(movie_indices),
    )


@router.get("/history")
async def get_history(
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the user's recent search and view history."""
    result = await db.execute(
        select(SearchHistory)
        .where(SearchHistory.user_id == current_user.user_id)
        .order_by(SearchHistory.timestamp.desc())
        .limit(limit)
    )
    return [
        {"id": e.id, "query": e.query, "event_type": e.event_type, "timestamp": e.timestamp.isoformat()}
        for e in result.scalars().all()
    ]
