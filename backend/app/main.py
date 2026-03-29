"""main.py — FastAPI application entry point."""

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app import recommender
from app.models import (
    RecommendationResponse, MovieRecommendation, MovieDetail,
    ExplanationResponse, SharedFeature, SearchResult,
    FullMovieDetailResponse, PaginatedMoviesResponse,
)
from app.database import create_tables, get_db
from app.db_models import User, Movie, Rating, WatchlistEntry, SearchHistory  # noqa: F401
from app.routers import auth as auth_router
from app.routers import ratings as ratings_router
from app.routers import watchlist as watchlist_router
from app.routers import personalized as personalized_router
from app.auth import get_current_user_optional
from app.taste import update_user_taste


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create DB tables on startup."""
    await create_tables()
    print(f"Server started — {len(recommender.get_all_movies())} movies loaded")
    yield


app = FastAPI(
    title="Movie Recommendation System",
    description="Content-based movie recommendations using TF-IDF and Cosine Similarity.",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(ratings_router.router)
app.include_router(watchlist_router.router)
app.include_router(personalized_router.router)


class SearchLogRequest(BaseModel):
    query: str
    selected_movie_id: int | None = None


@app.get("/api/search", response_model=list[SearchResult])
async def smart_search(
    q: str = Query(..., min_length=1),
    n: int = Query(default=20, ge=1, le=50),
):
    """Smart search using title, metadata, and TF-IDF matching."""
    return [SearchResult(**r) for r in recommender.smart_search(q, n=n)]


@app.post("/api/search/log", status_code=204)
async def log_search(
    body: SearchLogRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """Log a search event for authenticated users."""
    if not current_user or not body.query.strip():
        return
    db.add(SearchHistory(
        user_id=current_user.user_id,
        query=body.query.strip(),
        event_type="search",
        selected_movie_id=body.selected_movie_id,
    ))
    await db.commit()


@app.get("/api/popular", response_model=list[MovieDetail])
async def popular_movies(n: int = Query(default=30, ge=1, le=100)):
    """Get most popular movies."""
    return [MovieDetail(**r) for r in recommender.get_popular_movies(n=n)]


@app.get("/api/movies", response_model=list[str])
async def get_movies(search: str = Query(default=None)):
    """Title autocomplete filter."""
    return recommender.get_all_movies(search=search)


@app.get("/api/genres", response_model=list[str])
async def get_genres():
    """Get all unique genres."""
    return recommender.get_all_genres()


@app.get("/api/browse", response_model=PaginatedMoviesResponse)
async def browse_movies(
    genre: list[str] = Query(default=[]),
    year: int | None = Query(default=None),
    year_mode: str | None = Query(default=None),
    sort: str = Query(default="popularity"),
    order: str = Query(default="desc"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=24, ge=1, le=60),
):
    """Browse and filter movies with pagination."""
    result = recommender.browse_movies(
        genres=genre if genre else None,
        year=year, year_mode=year_mode,
        sort_by=sort, order=order,
        page=page, page_size=page_size,
    )
    return PaginatedMoviesResponse(
        movies=[MovieDetail(**m) for m in result["movies"]],
        total=result["total"], page=result["page"],
        page_size=result["page_size"], total_pages=result["total_pages"],
    )


@app.get("/api/recommend/{movie_title}", response_model=RecommendationResponse)
async def get_recommendations(
    movie_title: str,
    n: int = Query(default=10, ge=1, le=50),
):
    """Get top N similar movies."""
    try:
        results = recommender.recommend(movie_title, n=n)
        return RecommendationResponse(
            movie=movie_title,
            recommendations=[MovieRecommendation(**r) for r in results],
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/api/movie/{movie_title}", response_model=MovieDetail)
async def get_movie_detail(movie_title: str):
    """Get basic movie details."""
    try:
        return MovieDetail(**recommender.get_movie_detail(movie_title))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/api/movie/{movie_title}/full", response_model=FullMovieDetailResponse)
async def get_movie_full_detail(
    movie_title: str,
    n: int = Query(default=10, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """Get movie metadata, recommendations, and director films in one call."""
    try:
        full = recommender.get_movie_full_detail(movie_title, n_recs=n)

        if current_user:
            from datetime import datetime, timezone

            recent_view = await db.execute(
                select(SearchHistory)
                .where(
                    SearchHistory.user_id == current_user.user_id,
                    SearchHistory.query == movie_title,
                    SearchHistory.event_type == "view",
                )
                .order_by(SearchHistory.timestamp.desc())
                .limit(1)
            )
            recent = recent_view.scalar_one_or_none()

            should_log = True
            if recent and (datetime.now(timezone.utc) - recent.timestamp).total_seconds() < 10:
                should_log = False

            if should_log:
                db.add(SearchHistory(
                    user_id=current_user.user_id,
                    query=movie_title,
                    event_type="view",
                ))
                await db.commit()
                await update_user_taste(db, current_user, movie_title, learning_rate=0.05)

        return FullMovieDetailResponse(
            movie=MovieDetail(**full["movie"]),
            if_you_like_this=[MovieRecommendation(**r) for r in full["if_you_like_this"]],
            more_from_director=[MovieDetail(**m) for m in full["more_from_director"]],
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/api/director/{director_name}", response_model=list[MovieDetail])
async def get_movies_by_director(director_name: str):
    """Get all movies by a director."""
    movies = recommender.get_movies_by_director(director_name)
    if not movies:
        raise HTTPException(status_code=404, detail=f"No movies found for director '{director_name}'")
    return [MovieDetail(**m) for m in movies]


@app.get("/api/explain/{movie_a}/{movie_b}", response_model=ExplanationResponse)
async def explain_similarity(movie_a: str, movie_b: str):
    """Show shared TF-IDF features between two movies."""
    try:
        explanation = recommender.get_explanation(movie_a, movie_b)
        return ExplanationResponse(
            movie_a=explanation["movie_a"],
            movie_b=explanation["movie_b"],
            similarity_score=explanation["similarity_score"],
            shared_features=[SharedFeature(**f) for f in explanation["shared_features"]],
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "movies_loaded": len(recommender.get_all_movies())}
