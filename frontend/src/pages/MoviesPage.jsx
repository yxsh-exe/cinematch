import { useState, useEffect } from "react";
import { useSearch, useNavigate } from "@tanstack/react-router";
import { getGenres, browseMovies } from "../api";
import MovieCard, { MovieCardSkeleton } from "../components/MovieCard";
import {
  FunnelIcon,
  XIcon,
  CaretLeftIcon,
  CaretRightIcon,
  FilmStripIcon,
  ArrowUpIcon,
  ArrowCounterClockwiseIcon,
} from "@phosphor-icons/react";

const SORT_OPTIONS = [
  { value: "popularity", label: "Popularity" },
  { value: "vote_average", label: "Rating" },
  { value: "release_year", label: "Year" },
  { value: "title", label: "Title" },
];

function getPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [];
  if (current <= 4) {
    for (let i = 1; i <= 5; i++) pages.push(i);
    pages.push("...", total);
  } else if (current >= total - 3) {
    pages.push(1, "...");
    for (let i = total - 4; i <= total; i++) pages.push(i);
  } else {
    pages.push(1, "...", current - 1, current, current + 1, "...", total);
  }
  return pages;
}

function PaginationBar({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-1.5">
      <button
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="p-2 rounded-lg bg-muted border border-border text-foreground hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <CaretLeftIcon size={16} weight="bold" />
      </button>

      {getPageNumbers(page, totalPages).map((p, i) =>
        p === "..." ? (
          <span key={`dots-${i}`} className="px-2 text-muted-foreground text-sm">
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-colors ${
              p === page
                ? "bg-foreground text-background"
                : "bg-muted border border-border text-foreground hover:bg-accent"
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="p-2 rounded-lg bg-muted border border-border text-foreground hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <CaretRightIcon size={16} weight="bold" />
      </button>
    </div>
  );
}

export default function MoviesPage() {
  const search = useSearch({ strict: false });
  const navigate = useNavigate();

  const [movies, setMovies] = useState([]);
  const [genres, setGenres] = useState([]);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [sort, setSort] = useState("popularity");
  const [order, setOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(true);

  useEffect(() => {
    getGenres().then(setGenres).catch(() => {});
  }, []);

  useEffect(() => {
    if (search.genre) {
      setSelectedGenres([search.genre]);
      setPage(1);
    }
  }, [search.genre]);

  useEffect(() => {
    setLoading(true);
    browseMovies({ genres: selectedGenres, sort, order, page, pageSize: 24 })
      .then((data) => {
        setMovies(data.movies);
        setTotalPages(data.total_pages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedGenres, sort, order, page]);

  const toggleGenre = (genre) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
    setPage(1);
  };

  const handleSortChange = (newSort) => {
    if (newSort === sort) {
      setOrder((prev) => (prev === "desc" ? "asc" : "desc"));
    } else {
      setSort(newSort);
      setOrder("desc");
    }
    setPage(1);
  };

  const clearFilters = () => {
    setSelectedGenres([]);
    setPage(1);
    navigate({ to: "/movies", search: {}, replace: true });
  };

  const hasFilters = selectedGenres.length > 0;

  return (
    <div className="min-h-screen page-enter">
      {/* Header */}
      <div className="px-4 sm:px-6 md:px-10 pt-8 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="font-sans text-3xl sm:text-4xl font-bold flex items-center gap-3">
          <FilmStripIcon size={32} weight="duotone" className="text-chart-2" />
          Browse Movies
        </h1>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Sort buttons */}
          <div className="flex items-center gap-1 bg-muted border border-border rounded-lg p-1">
            {SORT_OPTIONS.map((opt) => {
              const active = sort === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleSortChange(opt.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
                    active
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                  {active && (
                    <ArrowUpIcon
                      size={11}
                      weight="bold"
                      className={`transition-transform duration-300 ${
                        order === "asc" ? "rotate-0" : "rotate-180"
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Filter toggle (mobile) */}
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className={`md:hidden flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
              filterOpen
                ? "bg-foreground text-background border-foreground"
                : "bg-muted text-foreground border-border hover:border-foreground/20"
            }`}
          >
            <FunnelIcon size={16} weight="bold" />
            Filter
          </button>
        </div>
      </div>

      <div className="px-4 sm:px-6 md:px-10 pb-10 flex flex-col md:flex-row gap-6">
        {/* Filter Sidebar */}
        <div className={`shrink-0 md:w-60 ${filterOpen ? "block" : "hidden md:block"}`}>
          <div className="sticky top-20 bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
            {/* Sidebar header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <FunnelIcon size={16} weight="duotone" className="text-muted-foreground" />
                <span className="text-sm font-bold uppercase tracking-widest text-foreground">
                  Filters
                </span>
              </div>
              {hasFilters && (
                <span className="px-2 py-0.5 bg-chart-1/20 text-chart-1 text-xs font-bold rounded-full">
                  {selectedGenres.length}
                </span>
              )}
            </div>

            <div className="p-5 flex flex-col gap-5">
              {/* Active filter pills */}
              {hasFilters && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedGenres.map((g) => (
                    <span
                      key={g}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-chart-2/10 border border-chart-2/20 rounded-full text-xs font-medium text-foreground"
                    >
                      {g}
                      <button
                        onClick={() => toggleGenre(g)}
                        className="hover:text-destructive transition-colors ml-0.5"
                      >
                        <XIcon size={11} weight="bold" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Genre section */}
              <div>
                <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
                  <FilmStripIcon size={13} weight="bold" />
                  Genre
                </h3>
                <div className="flex flex-col gap-0.5 max-h-64 overflow-y-auto scrollbar-hide">
                  {genres.map((genre) => {
                    const checked = selectedGenres.includes(genre);
                    return (
                      <label
                        key={genre}
                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
                          checked
                            ? "bg-chart-2/10 border-l-2 border-chart-2"
                            : "hover:bg-accent/50 border-l-2 border-transparent"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleGenre(genre)}
                          className="w-3.5 h-3.5 rounded border-border bg-muted accent-chart-1 shrink-0"
                        />
                        <span className={`text-sm ${checked ? "text-foreground font-medium" : "text-foreground"}`}>
                          {genre}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Clear all — bottom of sidebar */}
              {hasFilters && (
                <>
                  <div className="border-t border-border" />
                  <button
                    onClick={clearFilters}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-destructive bg-destructive/5 hover:bg-destructive/10 border border-destructive/20 rounded-xl transition-colors"
                  >
                    <ArrowCounterClockwiseIcon size={14} weight="bold" />
                    Clear All Filters
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Movie Grid */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">
          {loading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {Array.from({ length: 24 }).map((_, i) => (
                <MovieCardSkeleton key={i} />
              ))}
            </div>
          ) : movies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <FilmStripIcon size={48} weight="thin" className="opacity-40 mb-3" />
              <p className="text-lg font-medium">No movies found</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-4 px-4 py-2 bg-muted border border-border rounded-lg text-sm font-medium hover:bg-accent transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Pagination — top */}
              <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />

              {/* Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 stagger-grid">
                {movies.map((movie) => (
                  <MovieCard key={movie.movie_id} movie={movie} />
                ))}
              </div>

              {/* Pagination — bottom */}
              <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
