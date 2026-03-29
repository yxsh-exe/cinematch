"""models.py — Pydantic response models for ML/recommendation endpoints."""

from pydantic import BaseModel


class MovieBase(BaseModel):
    """Base movie data returned in most responses."""
    title: str
    movie_id: int
    overview: str
    genres: str
    cast: str
    cast_full: str = ""
    director: str
    keywords: str
    vote_average: float
    popularity: float
    poster_url: str
    release_year: int = 0
    runtime: int = 0


class MovieRecommendation(MovieBase):
    """Movie with similarity score."""
    similarity_score: float
    index: int


class RecommendationResponse(BaseModel):
    movie: str
    recommendations: list[MovieRecommendation]


class MovieDetail(MovieBase):
    pass


class FullMovieDetailResponse(BaseModel):
    movie: MovieDetail
    if_you_like_this: list[MovieRecommendation]
    more_from_director: list[MovieDetail]


class SearchResult(MovieBase):
    relevance_score: float
    match_type: str


class SharedFeature(BaseModel):
    feature: str
    score_movie_a: float
    score_movie_b: float
    combined_score: float


class ExplanationResponse(BaseModel):
    movie_a: str
    movie_b: str
    similarity_score: float
    shared_features: list[SharedFeature]


class PaginatedMoviesResponse(BaseModel):
    movies: list[MovieDetail]
    total: int
    page: int
    page_size: int
    total_pages: int


class PersonalizedMovie(MovieBase):
    relevance_score: float


class PersonalizedResponse(BaseModel):
    recommendations: list[PersonalizedMovie]
    based_on_count: int
