# CineMatch

A content-based movie recommendation system. Uses TF-IDF vectorization and cosine similarity to suggest movies based on genres, keywords, cast, and crew metadata from the TMDB 5000 dataset.

Built with FastAPI (Python) on the backend and React 19 on the frontend.

## Prerequisites

- [Python 3.14+](https://www.python.org/downloads/)
- [uv](https://docs.astral.sh/uv/) (Python package manager)
- [Node.js 18+](https://nodejs.org/)
- [PostgreSQL](https://www.postgresql.org/)

## Dataset Setup

Download the TMDB 5000 dataset and place the CSV files in the `backend/` directory:

1. Get `tmdb_5000_movies.csv` and `tmdb_5000_credits.csv` from [Kaggle TMDB 5000](https://www.kaggle.com/datasets/tmdb/tmdb-movie-metadata).
2. Optionally, get `9000plus.csv` from [Kaggle 9000+ Movies](https://www.kaggle.com/datasets/disham993/9000-movies-dataset) for poster image URLs.
3. Place all CSV files directly inside the `backend/` folder.

## Backend Setup

### 1. Navigate to the backend directory

```
cd backend
```

### 2. Install dependencies

```
uv sync
```

### 3. Configure environment variables

Create a `.env` file in the `backend/` directory with the following:

```
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/movies
JWT_SECRET=your-secret-key
```

If using Supabase, copy the connection string from Project Settings > Database > Connection string > URI, and change `postgresql://` to `postgresql+asyncpg://`.

### 4. Build the recommendation model

This processes the raw CSV files, computes TF-IDF vectors and cosine similarity, and merges poster URLs into a single cleaned dataset.

```
uv run python -m app.build_model
```

On Windows, if you see encoding errors, run this instead:

```
set PYTHONIOENCODING=utf-8 && uv run python -m app.build_model
```

### 5. Start the backend server

```
uv run uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

## Frontend Setup

### 1. Open a new terminal and navigate to the frontend directory

```
cd frontend
```

### 2. Install dependencies

```
npm install
```

### 3. Start the development server

```
npm run dev
```

The app will be available at `http://localhost:5173`.

## Running the Application

Both servers need to be running at the same time. Keep the backend running in one terminal and the frontend in another, then open `http://localhost:5173` in your browser.

### Quick Start

If you have a Bash environment installed (such as Git Bash on Windows, or default terminals on macOS/Linux), you can run both servers concurrently using the provided script from the project root:

```bash
./dev.sh
# or
bash dev.sh
```

Press `Ctrl+C` in the terminal running the script to cleanly stop both servers.

## Tech Stack

**Backend:** FastAPI, SQLAlchemy (async), PostgreSQL, scikit-learn, Pandas

**Frontend:** React 19, Vite, Tailwind CSS 4, TanStack Router

**Recommendation Engine:** TF-IDF vectorization over combined metadata (genres, keywords, cast, crew, overview) with cosine similarity scoring.

---

## How the Recommendation Engine Works

CineMatch uses **content-based filtering** — it analyzes the content of each movie (plot, genres, cast, director, keywords) and finds movies that are textually and semantically similar, without relying on what other users watched.

The pipeline has two phases:

| Phase | When | What happens |
|---|---|---|
| **Build** (`build_model.py`) | Once, offline | Raw CSVs → cleaned data → TF-IDF matrix → similarity matrix → `.pkl` files |
| **Serve** (`recommender.py`) | At runtime | Load `.pkl` files into memory → answer API requests in milliseconds |

---

### Phase 1 — Building the Model

#### Data Loading & Merging

Two TMDB CSV datasets are merged on the `title` column:

- `tmdb_5000_movies.csv` — plot overviews, genres, keywords, ratings, popularity
- `tmdb_5000_credits.csv` — full cast and crew JSON arrays

A third file `9000plus.csv` provides poster URLs matched by title.

#### Feature Extraction

JSON-encoded fields are parsed into Python lists:

```
genres:   [{"id": 28, "name": "Action"}, ...]  →  ["Action", "Adventure"]
keywords: [{"id": 1562, "name": "spy"}, ...]   →  ["spy", "secret agent"]
cast:     [{"name": "Tom Hanks", ...}, ...]    →  ["TomHanks", "RobinWright"]
crew:     [{"job": "Director", "name": "..."}] →  "ChristopherNolan"
```

Multi-word names (e.g. `"Tom Hanks"`) have spaces removed to become `"TomHanks"`. This forces TF-IDF to treat a person's full name as a **single token** — without it, "Tom" and "Hanks" would independently match unrelated movies.

#### Building the Tags String

Every movie is reduced to a single `tags` string that concatenates:

```
tags = overview_words + genres + keywords + top_3_cast + director
```

Example for *Inception*:
```
"a thief who steals corporate secrets through dream sharing technology
 action scifi thriller dream heist inception leonardodicaprio
 josephgordon-levitt tomhardy christophernolan"
```

This tags string is the **sole input** to the ML model. All signal about a movie lives here.

#### TF-IDF Vectorization

**TF-IDF** (Term Frequency – Inverse Document Frequency) converts each movie's tags into a numeric vector.

**Term Frequency (TF)** — how often a word appears in *this* movie's tags:

```
TF(word, movie) = count(word in movie) / total words in movie
```

**Inverse Document Frequency (IDF)** — how rare a word is across *all* movies. Common words like "world" carry little signal; rare words like `"christophernolan"` are highly distinctive:

```
IDF(word) = log( total movies / movies containing word )
```

The combined score:

```
TF-IDF(word, movie) = TF × IDF
```

Configuration: `max_features=5000` (top 5,000 informative words), `stop_words="english"` (discard "is", "the", "and", etc.).

The result is a **sparse matrix of shape `(4803 movies × 5000 features)`** — each row is a movie as a point in 5,000-dimensional space:

```
              "dream"  "nolan"  "heist"  "robot"  ...
Inception      0.312    0.289    0.201    0.000   ...
The Dark Knight 0.000   0.315    0.000    0.000   ...
Wall-E         0.000    0.000    0.000    0.421   ...
```

#### Cosine Similarity Matrix

**Cosine similarity** measures the angle between two movie vectors. It ignores magnitude (a long overview vs. a short one) and focuses on *which concepts appear*, not how much text describes them:

```
cosine_similarity(A, B) = (A · B) / (|A| × |B|)
```

Result: always between `0` (nothing in common) and `1` (identical content).

A **4803 × 4803 similarity matrix** is computed where `[i][j]` is the similarity score between movie `i` and movie `j`. This matrix (~88 MB) is precomputed once so runtime lookups are O(1).

#### Saved Artifacts

| File | Contents |
|---|---|
| `app/data/movies_cleaned.csv` | Cleaned movie metadata |
| `app/data/similarity.pkl` | 4803×4803 float32 similarity matrix |
| `app/data/tfidf_matrix.pkl` | 4803×5000 sparse TF-IDF matrix |
| `app/data/vectorizer.pkl` | Fitted TfidfVectorizer |

---

### Phase 2 — Serving Recommendations

All artifacts are loaded once at server startup into memory. Every subsequent request is served from RAM — no ML inference happens at request time.

#### Movie-to-Movie Recommendations

Given a movie title:

1. Look up its row index in the similarity matrix
2. Read that row — 4,803 similarity scores, one per movie
3. Sort descending, skip index 0 (the movie itself, score = 1.0)
4. Return the top N results

```python
similarity_scores = _similarity_matrix[movie_idx]   # O(1) row read
top_n = sorted(enumerate(similarity_scores), key=lambda x: x[1], reverse=True)[1:n+1]
```

#### Personalized Recommendations

When a user has rated movies, a **user profile vector** is computed:

1. Fetch the TF-IDF vector for each movie the user interacted with
2. Compute a **weighted average** — higher-rated movies contribute more

```
user_profile = weighted_average(tfidf_vectors, weights = ratings / 10.0)
```

3. Compute cosine similarity between the profile vector and every movie
4. Exclude already-seen movies; return top N

The user profile lives in the same 5,000-dimensional space as the movies, so recommendations naturally drift toward the user's preferred genres, directors, and themes.

#### Persistent Taste Vector

For real-time taste tracking, each user interaction blends the movie's vector into their stored profile using an **exponential moving average (EMA)**:

```
new_profile = α × movie_vector + (1 - α) × old_profile
```

With `α = 0.1` (learning rate):
- Recent interactions have more influence than older ones
- The profile never fully forgets early preferences
- The profile is stored as a JSON float array per user in the database

#### Smart Search

Search results are ranked through a four-layer funnel, stopping early when enough results are found:

| Priority | Match type | Method |
|---|---|---|
| 1 | **Title** | Case-insensitive substring match on movie titles |
| 2 | **Director** | Exact or partial match on director name |
| 3 | **Metadata** | Keyword hits across genres, cast, keywords, and overview |
| 4 | **Semantic** | Cosine similarity between the query's TF-IDF vector and all movies |

For semantic search, the query is vectorized with the same fitted `TfidfVectorizer` and compared against the full `tfidf_matrix` — returning results even for natural language queries like *"space exploration survival"*.

---

### Data Flow Diagram

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                          OFFLINE BUILD PHASE                                ║
║                     uv run python -m app.build_model                        ║
╚══════════════════════════════════════════════════════════════════════════════╝

  ┌─────────────────────────┐   ┌─────────────────────────┐   ┌─────────────┐
  │  tmdb_5000_movies.csv   │   │  tmdb_5000_credits.csv  │   │ 9000plus    │
  │  overview, genres,      │   │  cast JSON,             │   │ .csv        │
  │  keywords, ratings      │   │  crew JSON              │   │ poster URLs │
  └────────────┬────────────┘   └────────────┬────────────┘   └──────┬──────┘
               │                             │                        │
               └──────────────┬──────────────┘                        │
                              ▼                                        │
                   ┌─────────────────────┐                            │
                   │   merge on title    │                            │
                   │   parse JSON fields │                            │
                   │   extract cast /    │                            │
                   │   director / genres │                            │
                   └──────────┬──────────┘                            │
                              │                                        │
                              ▼                                        │
                   ┌─────────────────────┐                            │
                   │   build tags string │                            │
                   │                     │                            │
                   │  overview words     │                            │
                   │  + genres           │                            │
                   │  + keywords         │                            │
                   │  + top 3 cast       │                            │
                   │  + director         │                            │
                   └──────────┬──────────┘                            │
                              │                                        │
                              ▼                                        ▼
                   ┌─────────────────────┐             ┌──────────────────────┐
                   │  TF-IDF Vectorizer  │             │   merge poster URLs  │
                   │  max_features=5000  │             │   by title match     │
                   │  stop_words=english │             └──────────┬───────────┘
                   └──────────┬──────────┘                        │
                              │                                    │
                              ▼                                    ▼
                   ┌─────────────────────┐          ┌─────────────────────────┐
                   │    tfidf_matrix     │          │    movies_cleaned.csv   │
                   │   4803 × 5000       │          │    metadata + posters   │
                   │   (sparse float32)  │          └─────────────────────────┘
                   └──────────┬──────────┘
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
  ┌─────────────────────────┐   ┌─────────────────────────┐
  │   cosine_similarity()   │   │   save as-is to disk    │
  │   4803 × 4803 matrix    │   │                         │
  │   ~88 MB                │   │   tfidf_matrix.pkl      │
  └────────────┬────────────┘   │   vectorizer.pkl        │
               │                └─────────────────────────┘
               ▼
  ┌─────────────────────────┐
  │     similarity.pkl      │
  │   precomputed scores    │
  │   O(1) lookup at serve  │
  └─────────────────────────┘


╔══════════════════════════════════════════════════════════════════════════════╗
║                           RUNTIME SERVE PHASE                               ║
║                  uv run uvicorn app.main:app --port 8000                    ║
╚══════════════════════════════════════════════════════════════════════════════╝

  startup: load similarity.pkl + tfidf_matrix.pkl + vectorizer.pkl into RAM
  ─────────────────────────────────────────────────────────────────────────────

  GET /recommend?title=X
  ──────────────────────
  title ──► index lookup ──► read similarity row ──► sort desc ──► top N movies

  GET /personalized
  ─────────────────
  user ratings ──► fetch tfidf vectors ──► weighted average ──► user profile
                                                                      │
                        movies (excluding seen) ◄── cosine sim ───────┘

  GET /search?q=...
  ─────────────────
  query ──► [1] title substring match
        ──► [2] director name match
        ──► [3] keyword hits in metadata
        ──► [4] vectorize query ──► cosine sim vs tfidf_matrix ──► semantic results
```
