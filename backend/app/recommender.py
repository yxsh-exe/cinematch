"""recommender.py — Core recommendation engine using TF-IDF and cosine similarity."""

import os
import json
import pickle
import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

_movies_df = pd.read_csv(os.path.join(DATA_DIR, "movies_cleaned.csv"))

_movies_df["overview"] = _movies_df["overview"].fillna("")
_movies_df["genres"] = _movies_df["genres"].fillna("")
_movies_df["cast"] = _movies_df["cast"].fillna("")
if "cast_full" not in _movies_df.columns:
    _movies_df["cast_full"] = _movies_df["cast"]
else:
    _movies_df["cast_full"] = _movies_df["cast_full"].fillna("")
if "poster_url" not in _movies_df.columns:
    _movies_df["poster_url"] = ""
else:
    _movies_df["poster_url"] = _movies_df["poster_url"].fillna("")
_movies_df["director"] = _movies_df["director"].fillna("")
_movies_df["keywords"] = _movies_df["keywords"].fillna("")
_movies_df["release_year"] = _movies_df["release_year"].fillna(0).astype(int)
_movies_df["runtime"] = _movies_df["runtime"].fillna(0).astype(int)

with open(os.path.join(DATA_DIR, "similarity.pkl"), "rb") as f:
    _similarity_matrix = pickle.load(f)

with open(os.path.join(DATA_DIR, "vectorizer.pkl"), "rb") as f:
    _vectorizer = pickle.load(f)

with open(os.path.join(DATA_DIR, "tfidf_matrix.pkl"), "rb") as f:
    _tfidf_matrix = pickle.load(f)

_title_to_index = {title.lower(): idx for idx, title in enumerate(_movies_df["title"])}

_director_to_indices = {}
for idx, director in enumerate(_movies_df["director"]):
    if pd.notna(director) and director.strip():
        key = director.strip().lower()
        if key not in _director_to_indices:
            _director_to_indices[key] = []
        _director_to_indices[key].append(idx)

_searchable_metadata = []
for idx in range(len(_movies_df)):
    row = _movies_df.iloc[idx]
    parts = []
    for col in ("keywords", "genres", "overview", "cast", "director"):
        val = row.get(col, "")
        if pd.notna(val) and val:
            parts.append(str(val).lower())
    _searchable_metadata.append(" ".join(parts))

_ALL_GENRES = sorted({
    g.strip()
    for genres_str in _movies_df["genres"]
    if pd.notna(genres_str) and genres_str.strip()
    for g in genres_str.split(",")
    if g.strip()
})


def _find_movie_index(title: str) -> int:
    """Look up movie index by title (case-insensitive). Raises ValueError if not found."""
    idx = _title_to_index.get(title.strip().lower())
    if idx is None:
        raise ValueError(f"Movie '{title}' not found in the dataset.")
    return idx


def get_poster_url(title: str) -> str:
    """Look up poster_url by title."""
    idx = _title_to_index.get(title.strip().lower())
    if idx is None:
        return ""
    row = _movies_df.iloc[idx]
    return row["poster_url"] if pd.notna(row["poster_url"]) else ""


def _movie_to_dict(idx: int) -> dict:
    """Convert a DataFrame row to a movie dict."""
    row = _movies_df.iloc[idx]
    return {
        "title": row["title"],
        "movie_id": int(row["movie_id"]),
        "overview": row["overview"],
        "genres": row["genres"],
        "cast": row["cast"],
        "cast_full": row["cast_full"],
        "director": row["director"],
        "keywords": row["keywords"],
        "vote_average": float(row["vote_average"]) if pd.notna(row["vote_average"]) else 0.0,
        "popularity": float(row["popularity"]) if pd.notna(row["popularity"]) else 0.0,
        "poster_url": row["poster_url"] if pd.notna(row["poster_url"]) else "",
        "release_year": int(row["release_year"]) if pd.notna(row["release_year"]) else 0,
        "runtime": int(row["runtime"]) if pd.notna(row["runtime"]) else 0,
    }


def recommend(movie_title: str, n: int = 10) -> list[dict]:
    """Get top N most similar movies using cosine similarity."""
    movie_idx = _find_movie_index(movie_title)
    similarity_scores = _similarity_matrix[movie_idx]

    similar_indices = sorted(
        enumerate(similarity_scores),
        key=lambda x: x[1],
        reverse=True,
    )[1:n + 1]

    recommendations = []
    for idx, score in similar_indices:
        movie = _movie_to_dict(idx)
        movie["similarity_score"] = round(float(score), 4)
        movie["index"] = int(idx)
        recommendations.append(movie)

    return recommendations


def get_all_movies(search: str = None) -> list[str]:
    """Get movie titles, optionally filtered by substring."""
    titles = _movies_df["title"].tolist()
    if search:
        search_lower = search.strip().lower()
        titles = [t for t in titles if search_lower in t.lower()]
    return titles


def get_popular_movies(n: int = 30) -> list[dict]:
    """Get most popular movies sorted by popularity and rating."""
    sorted_df = _movies_df.sort_values(by=["popularity", "vote_average"], ascending=[False, False])
    return [_movie_to_dict(int(idx)) for idx in sorted_df.head(n).index]


def smart_search(query: str, n: int = 20) -> list[dict]:
    """Multi-step search: title match -> director -> metadata substring -> TF-IDF semantic."""
    if not query or not query.strip():
        return []

    query_lower = query.strip().lower()
    seen_titles = set()
    results = []

    def _add(movie: dict, cap: int | None = None):
        if movie["title"] in seen_titles:
            return
        if cap is not None and sum(1 for r in results if r["match_type"] == movie["match_type"]) >= cap:
            return
        seen_titles.add(movie["title"])
        results.append(movie)

    for idx, title in enumerate(_movies_df["title"]):
        if query_lower in title.lower():
            movie = _movie_to_dict(idx)
            movie["relevance_score"] = 1.0
            movie["match_type"] = "title"
            _add(movie, cap=5)

    director_indices = _director_to_indices.get(query_lower, [])
    if not director_indices:
        for dir_key, dir_idx_list in _director_to_indices.items():
            if query_lower in dir_key or dir_key in query_lower:
                director_indices = dir_idx_list
                break
    for idx in director_indices[:5]:
        movie = _movie_to_dict(idx)
        movie["relevance_score"] = 0.95
        movie["match_type"] = "director"
        _add(movie)

    filler = {"movies", "movie", "films", "film", "show", "shows", "like", "about", "with", "the", "a", "an"}
    query_words = [w for w in query_lower.split() if w not in filler]
    if query_words:
        metadata_scored = []
        for idx in range(len(_movies_df)):
            meta = _searchable_metadata[idx]
            hits = sum(1 for w in query_words if w in meta)
            if hits > 0:
                metadata_scored.append((idx, hits))

        metadata_scored.sort(
            key=lambda x: (x[1], float(_movies_df.iloc[x[0]]["popularity"])),
            reverse=True,
        )
        for idx, hits in metadata_scored:
            if len(results) >= n:
                break
            movie = _movie_to_dict(idx)
            movie["relevance_score"] = round(0.5 + 0.4 * (hits / len(query_words)), 4)
            movie["match_type"] = "metadata"
            _add(movie)

    query_processed = query_lower
    filtered_words = [w for w in query_processed.split() if w not in filler]
    if filtered_words:
        query_processed = " ".join(filtered_words)
    if len(filtered_words) >= 2:
        query_processed = query_processed + " " + "".join(filtered_words)

    query_vector = _vectorizer.transform([query_processed])
    similarities = cosine_similarity(query_vector, _tfidf_matrix).flatten()
    top_indices = similarities.argsort()[::-1]

    for idx in top_indices:
        if len(results) >= n:
            break
        score = float(similarities[idx])
        if score < 0.01:
            break
        movie = _movie_to_dict(int(idx))
        movie["relevance_score"] = round(score, 4)
        movie["match_type"] = "semantic"
        _add(movie)

    return results[:n]


def get_movie_detail(movie_title: str) -> dict:
    """Get detailed info about a single movie."""
    return _movie_to_dict(_find_movie_index(movie_title))


def get_movie_full_detail(movie_title: str, n_recs: int = 10) -> dict:
    """Get movie metadata, recommendations, and director's other films."""
    idx = _find_movie_index(movie_title)
    movie = _movie_to_dict(idx)
    recommendations = recommend(movie_title, n=n_recs)

    director = _movies_df.iloc[idx]["director"]
    director_movies = []
    if pd.notna(director) and director.strip():
        director_movies = get_movies_by_director(director, exclude_title=movie_title)

    return {
        "movie": movie,
        "if_you_like_this": recommendations,
        "more_from_director": director_movies,
    }


def get_movies_by_director(director_name: str, exclude_title: str = None) -> list[dict]:
    """Get all movies by a director, sorted by popularity."""
    key = director_name.strip().lower()
    indices = _director_to_indices.get(key, [])

    if not indices:
        for dir_key, dir_indices in _director_to_indices.items():
            if key in dir_key or dir_key in key:
                indices = dir_indices
                break

    movies = []
    for idx in indices:
        movie = _movie_to_dict(idx)
        if exclude_title and movie["title"].lower() == exclude_title.strip().lower():
            continue
        movies.append(movie)

    movies.sort(key=lambda m: m["popularity"], reverse=True)
    return movies


def get_explanation(movie_a: str, movie_b: str, top_n: int = 15) -> dict:
    """Explain similarity between two movies via shared TF-IDF features."""
    idx_a = _find_movie_index(movie_a)
    idx_b = _find_movie_index(movie_b)

    vec_a = _vectorizer.transform([_movies_df.iloc[idx_a]["tags"]]).toarray()[0]
    vec_b = _vectorizer.transform([_movies_df.iloc[idx_b]["tags"]]).toarray()[0]
    feature_names = _vectorizer.get_feature_names_out()

    shared_features = []
    for i, feature in enumerate(feature_names):
        if vec_a[i] > 0 and vec_b[i] > 0:
            shared_features.append({
                "feature": feature,
                "score_movie_a": round(float(vec_a[i]), 4),
                "score_movie_b": round(float(vec_b[i]), 4),
                "combined_score": round(float(vec_a[i] + vec_b[i]), 4),
            })

    shared_features.sort(key=lambda x: x["combined_score"], reverse=True)

    return {
        "movie_a": _movies_df.iloc[idx_a]["title"],
        "movie_b": _movies_df.iloc[idx_b]["title"],
        "similarity_score": round(float(_similarity_matrix[idx_a][idx_b]), 4),
        "shared_features": shared_features[:top_n],
    }


def get_personalized_recommendations(
    movie_indices: list[int],
    ratings_map: dict[int, float] = None,
    n: int = 20,
) -> list[dict]:
    """Generate recommendations from a weighted average of user's interacted movie vectors."""
    if not movie_indices:
        return []

    vectors = []
    weights = []
    for idx in movie_indices:
        if 0 <= idx < _tfidf_matrix.shape[0]:
            vectors.append(_tfidf_matrix[idx].toarray()[0])
            weights.append(ratings_map[idx] / 10.0 if ratings_map and idx in ratings_map else 1.0)

    if not vectors:
        return []

    user_profile = np.average(np.array(vectors), axis=0, weights=weights).reshape(1, -1)
    similarities = cosine_similarity(user_profile, _tfidf_matrix).flatten()

    interacted_set = set(movie_indices)
    results = []
    for idx in similarities.argsort()[::-1]:
        if len(results) >= n:
            break
        if int(idx) in interacted_set:
            continue
        score = float(similarities[idx])
        if score < 0.01:
            break
        movie = _movie_to_dict(int(idx))
        movie["relevance_score"] = round(score, 4)
        results.append(movie)

    return results


def update_taste_profile(current_vector_json: str | None, movie_index: int, learning_rate: float = 0.1) -> str:
    """Blend a movie vector into the user's taste profile using exponential moving average."""
    movie_vec = _tfidf_matrix[movie_index].toarray()[0]

    if current_vector_json:
        old_profile = np.array(json.loads(current_vector_json))
        new_profile = learning_rate * movie_vec + (1 - learning_rate) * old_profile
    else:
        new_profile = movie_vec

    return json.dumps(new_profile.tolist())


def recommend_from_profile(taste_vector_json: str, exclude_indices: set[int] | None = None, n: int = 20) -> list[dict]:
    """Generate recommendations from a stored taste vector."""
    user_profile = np.array(json.loads(taste_vector_json)).reshape(1, -1)
    similarities = cosine_similarity(user_profile, _tfidf_matrix).flatten()

    exclude = exclude_indices or set()
    results = []
    for idx in similarities.argsort()[::-1]:
        if len(results) >= n:
            break
        if int(idx) in exclude:
            continue
        score = float(similarities[idx])
        if score < 0.01:
            break
        movie = _movie_to_dict(int(idx))
        movie["relevance_score"] = round(score, 4)
        results.append(movie)

    return results


def get_all_genres() -> list[str]:
    """Return all unique genre names, sorted alphabetically."""
    return _ALL_GENRES


def browse_movies(
    genres: list[str] | None = None,
    year: int | None = None,
    year_mode: str | None = None,
    sort_by: str = "popularity",
    order: str = "desc",
    page: int = 1,
    page_size: int = 24,
) -> dict:
    """Browse/filter movies with pagination. Genre filtering uses OR logic."""
    mask = pd.Series(True, index=_movies_df.index)

    if genres:
        genres_lower = {g.lower() for g in genres}
        mask &= _movies_df["genres"].apply(
            lambda g: any(
                genre.strip().lower() in genres_lower
                for genre in (g.split(",") if pd.notna(g) else [])
            )
        )

    if year_mode == "exact" and year:
        mask &= _movies_df["release_year"] == year
    elif year_mode == "older":
        mask &= (_movies_df["release_year"] > 0) & (_movies_df["release_year"] < 2022)

    filtered = _movies_df[mask]

    sort_col_map = {"popularity": "popularity", "vote_average": "vote_average", "release_year": "release_year", "title": "title"}
    col = sort_col_map.get(sort_by, "popularity")
    filtered = filtered.sort_values(col, ascending=(order == "asc"))

    total = len(filtered)
    total_pages = max(1, (total + page_size - 1) // page_size)
    page = min(page, total_pages)
    start = (page - 1) * page_size

    return {
        "movies": [_movie_to_dict(int(idx)) for idx in filtered.iloc[start:start + page_size].index],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }
