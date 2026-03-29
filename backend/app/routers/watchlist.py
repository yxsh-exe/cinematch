"""routers/watchlist.py — CRUD endpoints for user movie watchlists."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.db_models import User, Movie, WatchlistEntry
from app.auth import get_current_user
from app.schemas import WatchlistCreate, WatchlistUpdate, WatchlistResponse
from app import recommender
from app.taste import update_user_taste

router = APIRouter(prefix="/api/watchlist", tags=["Watchlist"])


@router.post("/", response_model=WatchlistResponse, status_code=status.HTTP_201_CREATED)
async def add_to_watchlist(
    entry_data: WatchlistCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a movie to your watchlist."""
    result = await db.execute(select(Movie).where(Movie.movie_id == entry_data.movie_id))
    movie = result.scalar_one_or_none()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    result = await db.execute(
        select(WatchlistEntry).where(
            WatchlistEntry.user_id == current_user.user_id,
            WatchlistEntry.movie_id == entry_data.movie_id,
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Movie already in your watchlist. Use PUT to update status.")

    new_entry = WatchlistEntry(user_id=current_user.user_id, movie_id=entry_data.movie_id, status=entry_data.status)
    db.add(new_entry)
    await db.commit()
    await db.refresh(new_entry)

    await update_user_taste(db, current_user, movie.title, learning_rate=0.10)

    return WatchlistResponse(
        entry_id=new_entry.entry_id, user_id=new_entry.user_id,
        movie_id=new_entry.movie_id, movie_title=movie.title,
        added_date=new_entry.added_date, status=new_entry.status,
    )


@router.get("/", response_model=list[WatchlistResponse])
async def get_my_watchlist(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all movies in the current user's watchlist."""
    result = await db.execute(
        select(WatchlistEntry, Movie.title)
        .join(Movie, WatchlistEntry.movie_id == Movie.movie_id)
        .where(WatchlistEntry.user_id == current_user.user_id)
        .order_by(WatchlistEntry.added_date.desc())
    )
    return [
        WatchlistResponse(
            entry_id=entry.entry_id, user_id=entry.user_id,
            movie_id=entry.movie_id, movie_title=title, title=title,
            poster_url=recommender.get_poster_url(title),
            added_date=entry.added_date, status=entry.status,
        )
        for entry, title in result.all()
    ]


@router.put("/{movie_id}", response_model=WatchlistResponse)
async def update_watchlist_status(
    movie_id: int,
    update_data: WatchlistUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the status of a movie in your watchlist."""
    result = await db.execute(
        select(WatchlistEntry).where(
            WatchlistEntry.user_id == current_user.user_id,
            WatchlistEntry.movie_id == movie_id,
        )
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Movie not found in your watchlist")

    entry.status = update_data.status
    await db.commit()
    await db.refresh(entry)

    movie_result = await db.execute(select(Movie.title).where(Movie.movie_id == movie_id))
    movie_title = movie_result.scalar_one_or_none()

    return WatchlistResponse(
        entry_id=entry.entry_id, user_id=entry.user_id,
        movie_id=entry.movie_id, movie_title=movie_title,
        added_date=entry.added_date, status=entry.status,
    )


@router.delete("/{movie_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_watchlist(
    movie_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a movie from your watchlist."""
    result = await db.execute(
        select(WatchlistEntry).where(
            WatchlistEntry.user_id == current_user.user_id,
            WatchlistEntry.movie_id == movie_id,
        )
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Movie not found in your watchlist")

    await db.delete(entry)
    await db.commit()
