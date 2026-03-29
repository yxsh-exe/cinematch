import { useState, useEffect, useRef } from "react";
import { useSearch, useNavigate } from "@tanstack/react-router";
import { smartSearch, logSearch } from "../api";
import MovieCard, { MovieCardSkeleton } from "../components/MovieCard";
import { MagnifyingGlassIcon, FilmReelIcon, ArrowLeftIcon } from "@phosphor-icons/react";

export default function SearchPage() {
  const { q } = useSearch({ strict: false });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(q || "");
  const lastQuery = useRef(q);
  const navigate = useNavigate();

  useEffect(() => {
    if (!q) {
      setLoading(false);
      setResults([]);
      return;
    }
    setSearchInput(q);
    lastQuery.current = q;
    setLoading(true);
    let cancelled = false;
    const timeoutId = setTimeout(async () => {
      try {
        const data = await smartSearch(q, 40);
        if (!cancelled) setResults(data);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 1000); // 1s debounce
    
    return () => { 
      cancelled = true; 
      clearTimeout(timeoutId);
    };
  }, [q]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      logSearch(searchInput.trim());
      navigate({ to: "/search", search: { q: searchInput.trim() } });
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8 sm:py-12 page-enter">
      {/* Back button */}
      <button
        onClick={() => window.history.back()}
        className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2 mb-4"
      >
        <ArrowLeftIcon size={16} weight="bold" />
        Back
      </button>

      {/* Search header with inline search for mobile */}
      <div className="mb-10 sm:mb-12">
        <div className="border-l-4 border-foreground pl-5 sm:pl-6 mb-6 animate-in fade-in slide-in-from-left-4 duration-500">
          {q ? (
            <>
              <h1 className="font-sans text-2xl sm:text-3xl md:text-5xl font-bold text-foreground leading-none flex items-center gap-3 flex-wrap">
                <MagnifyingGlassIcon size={28} weight="duotone" className="text-foreground shrink-0" />
                Results for{" "}
                <span className="text-muted-foreground font-serif italic font-normal">
                  &ldquo;{q}&rdquo;
                </span>
              </h1>
              <p className="text-muted-foreground font-medium text-sm uppercase tracking-wider mt-3 pl-10">
                {loading ? "Searching..." : `${results.length} movies found`}
              </p>
            </>
          ) : (
            <h1 className="font-sans text-2xl sm:text-3xl md:text-5xl font-bold text-foreground leading-none flex items-center gap-3">
              <MagnifyingGlassIcon size={28} weight="duotone" className="text-foreground shrink-0" />
              Search Movies
            </h1>
          )}
        </div>

        {/* Inline search form for this page */}
        <form onSubmit={handleSearch} className="relative max-w-xl">
          <MagnifyingGlassIcon
            size={18}
            weight="bold"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Try &quot;space movies&quot;, &quot;nolan&quot;, &quot;romantic comedy&quot;..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 bg-muted border border-border rounded-lg text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-all"
            aria-label="Search movies"
            autoFocus={!q}
          />
        </form>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5 md:gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <MovieCardSkeleton key={i} />
          ))}
        </div>
      ) : results.length === 0 && q ? (
        <div className="flex flex-col items-center justify-center py-20 sm:py-24 px-6 text-center border-2 border-dashed border-border rounded-xl bg-muted/30 min-h-[350px] sm:min-h-[400px]">
          <FilmReelIcon size={64} weight="thin" className="text-muted-foreground opacity-30 mb-6" />
          <p className="font-serif text-lg sm:text-xl text-muted-foreground max-w-md">
            No movies found for &ldquo;{q}&rdquo;. Try different keywords or browse popular
            movies.
          </p>
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5 md:gap-6 stagger-grid">
          {results.map((movie) => (
            <MovieCard key={movie.movie_id} movie={movie} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
