const BASE_URL = "http://localhost:8000/api";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }

  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return null;
  }

  return res.json();
}

export const register = (data) =>
  request("/auth/register", { method: "POST", body: JSON.stringify(data) });

export const login = async (email, password) => {
  const form = new URLSearchParams();
  form.append("username", email);
  form.append("password", password);

  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Login failed");
  }

  return res.json();
};

export const getMe = () => request("/auth/me");

export const smartSearch = (q, n = 20) =>
  request(`/search?q=${encodeURIComponent(q)}&n=${n}`);

export const logSearch = (query, selectedMovieId = null) =>
  request("/search/log", {
    method: "POST",
    body: JSON.stringify({ query, selected_movie_id: selectedMovieId }),
  }).catch(() => {}); // fire-and-forget, don't break UI on failure

export const getPopular = (n = 30) => request(`/popular?n=${n}`);

export const getMovies = (search) =>
  request(`/movies${search ? `?search=${encodeURIComponent(search)}` : ""}`);

export const getMovieDetail = (title) =>
  request(`/movie/${encodeURIComponent(title)}`);

export const getMovieFullDetail = (title, n = 10) =>
  request(`/movie/${encodeURIComponent(title)}/full?n=${n}`);

export const getRecommendations = (title, n = 10) =>
  request(`/recommend/${encodeURIComponent(title)}?n=${n}`);

export const getForYou = (n = 20) => request(`/personalized/for-you?n=${n}`);
export const getHistory = (limit = 20) =>
  request(`/personalized/history?limit=${limit}`);

export const createRating = (data) =>
  request("/ratings/", { method: "POST", body: JSON.stringify(data) });
export const getMyRatings = () => request("/ratings/");
export const updateRating = (movieId, data) =>
  request(`/ratings/${movieId}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteRating = (movieId) =>
  request(`/ratings/${movieId}`, { method: "DELETE" });

export const addToWatchlist = (data) =>
  request("/watchlist/", { method: "POST", body: JSON.stringify(data) });
export const getMyWatchlist = () => request("/watchlist/");
export const updateWatchlistStatus = (movieId, data) =>
  request(`/watchlist/${movieId}`, { method: "PUT", body: JSON.stringify(data) });
export const removeFromWatchlist = (movieId) =>
  request(`/watchlist/${movieId}`, { method: "DELETE" });

export const getDirectorMovies = (name) =>
  request(`/director/${encodeURIComponent(name)}`);

export const getGenres = () => request("/genres");

export const browseMovies = ({ genres = [], year, yearMode, sort = "popularity", order = "desc", page = 1, pageSize = 24 } = {}) => {
  const params = new URLSearchParams();
  genres.forEach((g) => params.append("genre", g));
  if (year) params.set("year", String(year));
  if (yearMode) params.set("year_mode", yearMode);
  params.set("sort", sort);
  params.set("order", order);
  params.set("page", String(page));
  params.set("page_size", String(pageSize));
  return request(`/browse?${params.toString()}`);
};

export const explainSimilarity = (a, b) =>
  request(`/explain/${encodeURIComponent(a)}/${encodeURIComponent(b)}`);
