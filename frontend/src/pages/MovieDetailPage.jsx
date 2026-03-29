import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { getMovieFullDetail, addToWatchlist, removeFromWatchlist, getMyWatchlist, createRating, updateRating, getMyRatings } from "../api";
import { useAuth } from "../AuthContext";
import MovieCard, { MovieCardSkeleton } from "../components/MovieCard";
import {
  StarIcon,
  CheckCircleIcon,
  LightbulbIcon,
  FilmSlateIcon,
  FilmReelIcon,
  CaretLeftIcon,
  CaretRightIcon,
  UserIcon,
  UsersIcon,
  BookmarkSimpleIcon,
  ArrowLeftIcon,
  StarHalfIcon,
} from "@phosphor-icons/react";

function PosterImage({ src, alt, className, fallbackClassName }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={fallbackClassName}>
        <FilmReelIcon size={56} weight="thin" className="opacity-30" />
        <span className="text-sm font-medium opacity-50 text-muted-foreground">No Poster</span>
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
}

function StarRating({ value, onChange, disabled }) {
  const [hovered, setHovered] = useState(0);

  return (
    <div
      className="flex items-center gap-1"
      role="radiogroup"
      aria-label="Rate this movie"
      onMouseLeave={() => setHovered(0)}
    >
      {[1, 2, 3, 4, 5].map((starIndex) => {
        const starValue = starIndex * 2;
        const halfStarValue = starValue - 1;

        const activeValue = hovered || value;
        let fillType = "regular";
        let colorClass = "text-muted-foreground/40";

        if (activeValue >= starValue) {
          fillType = "fill";
          colorClass = "text-chart-1";
        } else if (activeValue >= halfStarValue) {
          fillType = "half";
          colorClass = "text-chart-1";
        }

        return (
          <div
            key={starIndex}
            className="relative p-0.5 flex transition-transform hover:scale-110 active:scale-95 disabled:cursor-not-allowed"
          >
            {/* Left half (half star) */}
            <div
              className={`absolute inset-y-0 left-0 w-1/2 z-10 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              onMouseEnter={() => !disabled && setHovered(halfStarValue)}
              onClick={() => !disabled && onChange(halfStarValue)}
              aria-label={`${halfStarValue / 2} stars`}
            />
            {/* Right half (full star) */}
            <div
              className={`absolute inset-y-0 right-0 w-1/2 z-10 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              onMouseEnter={() => !disabled && setHovered(starValue)}
              onClick={() => !disabled && onChange(starValue)}
              aria-label={`${starValue / 2} stars`}
            />
            {fillType === "half" ? (
              <StarHalfIcon size={24} weight="fill" className={colorClass} />
            ) : (
              <StarIcon size={24} weight={fillType} className={colorClass} />
            )}
          </div>
        );
      })}
      {(hovered || value) > 0 && (
        <span className="ml-2 text-sm font-bold text-chart-1">
          {((hovered || value) / 2).toFixed(1)}/5
        </span>
      )}
    </div>
  );
}

const GENRE_COLORS = {
  Action: "bg-red-500/15 text-red-400 border-red-500/30",
  Adventure: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Animation: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  Comedy: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  Crime: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  Documentary: "bg-teal-500/15 text-teal-400 border-teal-500/30",
  Drama: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  Family: "bg-green-500/15 text-green-400 border-green-500/30",
  Fantasy: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  History: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  Horror: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  Music: "bg-pink-500/15 text-pink-400 border-pink-500/30",
  Mystery: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  Romance: "bg-pink-500/15 text-pink-300 border-pink-500/30",
  "Science Fiction": "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  "Sci-Fi": "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  Thriller: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  War: "bg-stone-500/15 text-stone-400 border-stone-500/30",
  Western: "bg-amber-600/15 text-amber-500 border-amber-600/30",
};
const DEFAULT_GENRE_COLOR = "bg-accent/60 text-foreground/80 border-border";

const VISIBLE_CAST_COUNT = 3;

export default function MovieDetailPage() {
  const { title } = useParams({ strict: false });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [watchlistMsg, setWatchlistMsg] = useState("");
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingMsg, setRatingMsg] = useState("");
  const [castExpanded, setCastExpanded] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const similarRef = useRef(null);
  const directorRef = useRef(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [title]);

  useEffect(() => {
    if (!title) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    setData(null);
    setUserRating(0);
    setCastExpanded(false);
    const load = async () => {
      try {
        const result = await getMovieFullDetail(decodeURIComponent(title));
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [title]);

  useEffect(() => {
    if (!user || !data?.movie?.movie_id) return;
    getMyRatings()
      .then((ratings) => {
        const existing = ratings.find((r) => r.movie_id === data.movie.movie_id);
        if (existing) setUserRating(existing.score);
      })
      .catch(() => {});
    getMyWatchlist()
      .then((list) => {
        const found = list.some((item) => item.movie_id === data.movie.movie_id);
        setInWatchlist(found);
      })
      .catch(() => {});
  }, [user, data?.movie?.movie_id]);

  const handleToggleWatchlist = async () => {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    setWatchlistLoading(true);
    try {
      if (inWatchlist) {
        await removeFromWatchlist(data.movie.movie_id);
        setInWatchlist(false);
        setWatchlistMsg("Removed from watchlist");
      } else {
        await addToWatchlist({ movie_id: data.movie.movie_id, status: "want_to_watch" });
        setInWatchlist(true);
        setWatchlistMsg("Added to watchlist!");
      }
      setTimeout(() => setWatchlistMsg(""), 3000);
    } catch (err) {
      setWatchlistMsg(err.message);
      setTimeout(() => setWatchlistMsg(""), 3000);
    } finally {
      setWatchlistLoading(false);
    }
  };

  const handleRate = async (score) => {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    setRatingSubmitting(true);
    try {
      if (userRating > 0) {
        await updateRating(data.movie.movie_id, { movie_id: data.movie.movie_id, score });
      } else {
        await createRating({ movie_id: data.movie.movie_id, score });
      }
      setUserRating(score);
      setRatingMsg("Rating saved!");
      setTimeout(() => setRatingMsg(""), 2000);
    } catch (err) {
      try {
        await updateRating(data.movie.movie_id, { movie_id: data.movie.movie_id, score });
        setUserRating(score);
        setRatingMsg("Rating updated!");
        setTimeout(() => setRatingMsg(""), 2000);
      } catch {
        setRatingMsg(err.message);
        setTimeout(() => setRatingMsg(""), 3000);
      }
    } finally {
      setRatingSubmitting(false);
    }
  };

  const handlePersonSearch = (name) => {
    navigate({ to: "/search", search: { q: name.trim() } });
  };

  const scrollCarousel = (ref, direction) => {
    if (ref.current) {
      ref.current.scrollBy({
        left: direction === "left" ? -320 : 320,
        behavior: "smooth",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background page-enter">
        <div className="max-w-[1600px] mx-auto px-6 md:px-16 pt-4">
          <div className="h-8 w-16 skeleton rounded" />
        </div>
        <div className="flex flex-col md:flex-row items-center md:items-end px-6 md:px-16 py-12 md:py-16 gap-10 border-b border-border">
          <div className="w-[280px] md:w-[340px] shrink-0 aspect-[2/3] skeleton rounded-lg" />
          <div className="flex-1 pb-6 flex flex-col gap-4 w-full">
            <div className="h-14 w-2/3 skeleton" />
            <div className="flex gap-2">
              <div className="h-7 w-16 skeleton rounded-full" />
              <div className="h-7 w-20 skeleton rounded-full" />
              <div className="h-7 w-18 skeleton rounded-full" />
            </div>
            <div className="h-24 w-full max-w-3xl skeleton" />
            <div className="h-11 w-44 skeleton rounded-lg" />
          </div>
        </div>
        <div className="max-w-[1600px] mx-auto px-6 md:px-16 py-16">
          <div className="h-8 w-64 skeleton mb-8" />
          <div className="flex gap-5 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex-none w-[230px]">
                <MovieCardSkeleton />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[1600px] mx-auto px-6 py-12 page-enter">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2 mb-4"
        >
          <ArrowLeftIcon size={16} weight="bold" />
          Back
        </button>
        <div className="bg-destructive/10 border-l-4 border-destructive text-destructive p-4 font-medium rounded-r-lg">
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { movie, if_you_like_this, more_from_director } = data;
  const genres = movie.genres ? movie.genres.split(",").map((g) => g.trim()).filter(Boolean) : [];
  const castSource = movie.cast_full || movie.cast || "";
  const castList = castSource ? castSource.split(",").map((c) => c.trim()).filter(Boolean) : [];

  return (
    <div className="min-h-screen bg-background text-foreground page-enter">
      {/* Back button */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-16 pt-4">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          <ArrowLeftIcon size={16} weight="bold" />
          Back
        </button>
      </div>

      {/* Hero Section */}
      <div className="relative flex flex-col md:flex-row items-center md:items-start px-4 sm:px-6 md:px-16 py-8 sm:py-12 md:py-16 gap-8 sm:gap-10 border-b border-border overflow-hidden">
        {movie.poster_url && (
          <>
            <div className="absolute inset-0">
              <img src={movie.poster_url} alt="" className="w-full h-full object-cover opacity-10 dark:opacity-5" onError={(e) => { e.target.style.display = "none"; }} />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-background/70" />
          </>
        )}

        <div className="w-[240px] sm:w-[280px] md:w-[340px] shrink-0 border border-border shadow-xl rounded-lg overflow-hidden z-10">
          <PosterImage
            src={movie.poster_url}
            alt={`${movie.title} poster`}
            className="w-full h-auto object-cover"
            fallbackClassName="w-full aspect-[2/3] bg-muted flex flex-col items-center justify-center gap-3"
          />
        </div>

        <div className="flex-1 z-10 pt-2 md:pt-4">
          <h1 className="font-sans text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold leading-none mb-5 text-balance">
            {movie.title}
          </h1>

          <div className="flex flex-wrap items-center gap-3 mb-6">
            {movie.vote_average > 0 && (
              <span className="text-chart-1 font-sans text-xl font-bold flex items-center gap-1.5">
                <StarIcon size={20} weight="fill" />
                {movie.vote_average.toFixed(1)}
              </span>
            )}
            {genres.map((g) => (
              <button
                key={g}
                onClick={() => navigate({ to: "/movies", search: { genre: g } })}
                className={`px-3.5 py-1.5 border rounded-full text-xs font-semibold tracking-wide uppercase hover:scale-105 active:scale-95 transition-all cursor-pointer ${GENRE_COLORS[g] || DEFAULT_GENRE_COLOR}`}
              >
                {g}
              </button>
            ))}
          </div>

          <p className="font-serif text-base sm:text-lg md:text-xl leading-relaxed text-muted-foreground max-w-3xl mb-8 border-l-2 border-border pl-5 py-1">
            {movie.overview}
          </p>

          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mb-8">
            {movie.director && (
              <div className="flex items-start gap-2.5">
                <UserIcon size={18} weight="duotone" className="text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <dt className="text-muted-foreground text-xs uppercase tracking-wider mb-0.5 font-semibold">Director</dt>
                  <dd>
                    <button
                      onClick={() => handlePersonSearch(movie.director)}
                      className="text-foreground font-medium underline underline-offset-4 decoration-muted-foreground/40 hover:decoration-foreground transition-colors"
                    >
                      {movie.director}
                    </button>
                  </dd>
                </div>
              </div>
            )}
            {castList.length > 0 && (
              <div className="flex items-start gap-2.5">
                <UsersIcon size={18} weight="duotone" className="text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <dt className="text-muted-foreground text-xs uppercase tracking-wider mb-0.5 font-semibold">Cast</dt>
                  <dd className="flex flex-wrap gap-x-1 gap-y-0.5 items-baseline">
                    {(castExpanded ? castList : castList.slice(0, VISIBLE_CAST_COUNT)).map((actor, i, arr) => (
                      <span key={actor}>
                        <button
                          onClick={() => handlePersonSearch(actor)}
                          className="text-foreground font-medium text-sm underline underline-offset-4 decoration-muted-foreground/40 hover:decoration-foreground transition-colors"
                        >
                          {actor}
                        </button>
                        {(castExpanded ? i < castList.length - 1 : i < arr.length - 1 && castList.length <= VISIBLE_CAST_COUNT) && (
                          <span className="text-muted-foreground">,&nbsp;</span>
                        )}
                      </span>
                    ))}
                    {!castExpanded && castList.length > VISIBLE_CAST_COUNT && (
                      <button
                        onClick={() => setCastExpanded(true)}
                        className="text-chart-2 text-sm font-medium hover:underline underline-offset-4 transition-colors ml-0.5"
                      >
                        &amp; {castList.length - VISIBLE_CAST_COUNT} more
                      </button>
                    )}
                    {castExpanded && castList.length > VISIBLE_CAST_COUNT && (
                      <button
                        onClick={() => setCastExpanded(false)}
                        className="text-muted-foreground text-xs font-medium hover:text-foreground transition-colors ml-1"
                      >
                        show less
                      </button>
                    )}
                  </dd>
                </div>
              </div>
            )}
          </dl>

          {/* Rating */}
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              {userRating > 0 ? "Your Rating" : "Rate This Movie"}
            </p>
            <StarRating
              value={userRating}
              onChange={handleRate}
              disabled={ratingSubmitting}
            />
            {ratingMsg && (
              <p className="text-sm font-medium text-chart-1 mt-1.5 toast-enter">{ratingMsg}</p>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              className={`flex items-center gap-2 px-5 sm:px-6 py-3 font-semibold uppercase tracking-wider text-sm rounded-lg active:scale-[0.97] transition-all ${
                inWatchlist
                  ? "bg-destructive text-destructive-foreground hover:opacity-90"
                  : "bg-primary text-primary-foreground hover:opacity-90"
              }`}
              onClick={handleToggleWatchlist}
              disabled={watchlistLoading}
            >
              <BookmarkSimpleIcon size={16} weight={inWatchlist ? "fill" : "bold"} />
              {inWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
            </button>
            {watchlistMsg && (
              <span className="flex items-center gap-1.5 text-foreground text-sm font-medium toast-enter">
                <CheckCircleIcon size={16} weight="fill" />
                {watchlistMsg}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-16 py-12 sm:py-16">
        {/* If You Like This */}
        {if_you_like_this?.length > 0 && (
          <section className="mb-16 sm:mb-20">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-8">
              <div className="flex items-center gap-2.5">
                <LightbulbIcon size={24} weight="duotone" className="text-chart-1" />
                <h2 className="font-sans text-lg sm:text-xl md:text-2xl font-bold">
                  If you liked {movie.title}
                </h2>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <button onClick={() => scrollCarousel(similarRef, "left")} className="p-2 rounded-full border border-border hover:bg-accent text-muted-foreground hover:text-foreground active:scale-95 transition-all" aria-label="Scroll left">
                  <CaretLeftIcon size={18} weight="bold" />
                </button>
                <button onClick={() => scrollCarousel(similarRef, "right")} className="p-2 rounded-full border border-border hover:bg-accent text-muted-foreground hover:text-foreground active:scale-95 transition-all" aria-label="Scroll right">
                  <CaretRightIcon size={18} weight="bold" />
                </button>
              </div>
            </div>
            <div ref={similarRef} className="flex gap-4 sm:gap-5 overflow-x-auto pb-6 snap-x snap-mandatory scrollbar-hide">
              {if_you_like_this.map((rec) => (
                <div key={rec.movie_id} className="flex-none w-[170px] sm:w-[200px] md:w-[230px] snap-center">
                  <MovieCard movie={rec} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* More From Director */}
        {more_from_director?.length > 0 && (
          <section>
            <div className="flex items-center justify-between border-b border-border pb-4 mb-8">
              <div className="flex items-center gap-2.5">
                <FilmSlateIcon size={24} weight="duotone" className="text-chart-5" />
                <h2 className="font-sans text-lg sm:text-xl md:text-2xl font-bold">More from {movie.director}</h2>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <button onClick={() => scrollCarousel(directorRef, "left")} className="p-2 rounded-full border border-border hover:bg-accent text-muted-foreground hover:text-foreground active:scale-95 transition-all" aria-label="Scroll left">
                  <CaretLeftIcon size={18} weight="bold" />
                </button>
                <button onClick={() => scrollCarousel(directorRef, "right")} className="p-2 rounded-full border border-border hover:bg-accent text-muted-foreground hover:text-foreground active:scale-95 transition-all" aria-label="Scroll right">
                  <CaretRightIcon size={18} weight="bold" />
                </button>
              </div>
            </div>
            <div ref={directorRef} className="flex gap-4 sm:gap-5 overflow-x-auto pb-6 snap-x snap-mandatory scrollbar-hide">
              {more_from_director.map((m) => (
                <div key={m.movie_id} className="flex-none w-[170px] sm:w-[200px] md:w-[230px] snap-center">
                  <MovieCard movie={m} />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
