"""build_model.py — Precompute TF-IDF vectors, cosine similarity, and merge poster URLs."""

import os
import json
import pickle
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MOVIES_CSV = os.path.join(BASE_DIR, "..", "tmdb_5000_movies.csv")
CREDITS_CSV = os.path.join(BASE_DIR, "..", "tmdb_5000_credits.csv")
POSTER_CSV = os.path.join(BASE_DIR, "..", "9000plus.csv")
DATA_DIR = os.path.join(BASE_DIR, "data")


def extract_names(json_string):
    """Parse JSON string and return list of 'name' values."""
    try:
        return [item["name"] for item in json.loads(json_string)]
    except (json.JSONDecodeError, TypeError):
        return []


def extract_top_cast(json_string, n=3):
    """Extract top N cast members ordered by billing."""
    try:
        return [item["name"] for item in json.loads(json_string)[:n]]
    except (json.JSONDecodeError, TypeError):
        return []


def extract_director(json_string):
    """Extract director name from crew JSON."""
    try:
        for member in json.loads(json_string):
            if member.get("job") == "Director":
                return member["name"]
        return ""
    except (json.JSONDecodeError, TypeError):
        return ""


def remove_spaces(name_list):
    """Remove spaces from names so TF-IDF treats them as single tokens."""
    return [name.replace(" ", "") for name in name_list]


def remove_spaces_str(name):
    """Remove spaces from a single string."""
    return name.replace(" ", "") if isinstance(name, str) else ""


def merge_poster_urls(df):
    """Merge poster URLs from 9000plus.csv into the dataframe by title match."""
    if not os.path.exists(POSTER_CSV):
        print("   Poster CSV not found, skipping poster merge")
        df["poster_url"] = ""
        return df

    posters = pd.read_csv(POSTER_CSV)
    poster_lookup = {}
    for _, row in posters.iterrows():
        title = str(row["Title"]).strip().lower()
        url = str(row["Poster_Url"]).strip()
        if title not in poster_lookup and url and url != "nan":
            poster_lookup[title] = url

    poster_urls = []
    matched = 0
    for _, row in df.iterrows():
        title = str(row["title"]).strip().lower()
        if title in poster_lookup:
            poster_urls.append(poster_lookup[title])
            matched += 1
        else:
            poster_urls.append("")

    df["poster_url"] = poster_urls
    print(f"   Posters matched: {matched}/{len(df)} ({matched/len(df)*100:.1f}%)")
    return df


def build():
    """Run the full data pipeline: load, parse, vectorize, save."""

    print("Step 1: Loading datasets...")
    movies = pd.read_csv(MOVIES_CSV)
    credits = pd.read_csv(CREDITS_CSV)
    print(f"   Movies: {movies.shape[0]} rows, Credits: {credits.shape[0]} rows")

    print("Step 2: Merging datasets...")
    df = movies.merge(credits, on="title")
    print(f"   Merged: {df.shape[0]} rows")

    print("Step 3: Parsing genres, keywords, cast, crew...")
    df["genres_list"] = df["genres"].apply(extract_names)
    df["keywords_list"] = df["keywords"].apply(extract_names)
    df["cast_list"] = df["cast"].apply(extract_top_cast)  # top 3 for ML
    df["cast_full_list"] = df["cast"].apply(lambda x: extract_top_cast(x, n=10))  # top 10 for display
    df["director"] = df["crew"].apply(extract_director)

    print("Step 4: Preparing metadata...")
    df["genres_display"] = df["genres_list"].apply(lambda x: ", ".join(x))
    df["cast_display"] = df["cast_list"].apply(lambda x: ", ".join(x))
    df["cast_full_display"] = df["cast_full_list"].apply(lambda x: ", ".join(x))
    df["keywords_display"] = df["keywords_list"].apply(lambda x: ", ".join(x))

    print("Step 5: Building tags...")
    df["genres_clean"] = df["genres_list"].apply(remove_spaces)
    df["keywords_clean"] = df["keywords_list"].apply(remove_spaces)
    df["cast_clean"] = df["cast_list"].apply(remove_spaces)
    df["director_clean"] = df["director"].apply(remove_spaces_str)
    df["overview"] = df["overview"].fillna("")
    df["overview_words"] = df["overview"].apply(lambda x: x.split())

    df["tags"] = df.apply(
        lambda row: " ".join(
            row["overview_words"] + row["genres_clean"] +
            row["keywords_clean"] + row["cast_clean"] + [row["director_clean"]]
        ),
        axis=1,
    ).str.lower()

    print("Step 6: Saving cleaned data...")
    df["release_year"] = pd.to_datetime(df["release_date"], errors="coerce").dt.year.fillna(0).astype(int)
    df["runtime"] = pd.to_numeric(df["runtime"], errors="coerce").fillna(0).astype(int)

    movies_cleaned = df[[
        "id", "title", "overview",
        "genres_display", "cast_display", "cast_full_display", "director", "keywords_display",
        "vote_average", "popularity", "release_year", "runtime", "tags",
    ]].copy()

    movies_cleaned = movies_cleaned.rename(columns={
        "id": "movie_id",
        "genres_display": "genres",
        "cast_display": "cast",
        "cast_full_display": "cast_full",
        "keywords_display": "keywords",
    })

    movies_cleaned = merge_poster_urls(movies_cleaned)

    os.makedirs(DATA_DIR, exist_ok=True)
    output_csv = os.path.join(DATA_DIR, "movies_cleaned.csv")
    movies_cleaned.to_csv(output_csv, index=False)
    print(f"   Saved: {output_csv} ({movies_cleaned.shape[0]} movies, {len(movies_cleaned.columns)} cols)")

    print("Step 7: Computing TF-IDF matrix...")
    tfidf = TfidfVectorizer(max_features=5000, stop_words="english")
    tfidf_matrix = tfidf.fit_transform(movies_cleaned["tags"])
    print(f"   Shape: {tfidf_matrix.shape}, density: {tfidf_matrix.nnz / (tfidf_matrix.shape[0] * tfidf_matrix.shape[1]):.4f}")

    print("Step 8: Computing cosine similarity...")
    similarity = cosine_similarity(tfidf_matrix)
    print(f"   Shape: {similarity.shape}, size: {similarity.nbytes / (1024 * 1024):.1f} MB")

    print("Step 9: Saving model artifacts...")
    for name, obj in [("similarity.pkl", similarity), ("vectorizer.pkl", tfidf), ("tfidf_matrix.pkl", tfidf_matrix)]:
        with open(os.path.join(DATA_DIR, name), "wb") as f:
            pickle.dump(obj, f)
        print(f"   Saved: {name}")

    print("\nBuild complete! Run the server with: uv run uvicorn app.main:app --reload")


if __name__ == "__main__":
    build()
