import { useState, useEffect, useRef, useCallback } from "react";
import { getPopular, getForYou } from "../api";
import { useAuth } from "../AuthContext";
import MovieCard, { MovieCardSkeleton } from "../components/MovieCard";
import {
  TrendUpIcon,
  SparkleIcon,
  CaretLeftIcon,
  CaretRightIcon,
  PopcornIcon,
  StarIcon,
  ShuffleAngularIcon,
  ArrowRightIcon,
  SpinnerIcon,
} from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function HomePage() {
  const [allPopular, setAllPopular] = useState([]);
  const [trending, setTrending] = useState([]);
  const [forYou, setForYou] = useState([]);
  const [loading, setLoading] = useState(true);
  const [heroIndex, setHeroIndex] = useState(0);
  const [randomizing, setRandomizing] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const forYouRef = useRef(null);
  const heroTimerRef = useRef(null);
  const progressRef = useRef(null);

  useEffect(() => {
    async function loadData() {
      try {
        const popular = await getPopular(30);
        const filtered = popular.filter((m) => m.poster_url);
        setAllPopular(filtered);
        setTrending(shuffleArray(filtered));

        if (user) {
          try {
            const personal = await getForYou(30);
            setForYou(
              (personal.recommendations || []).filter((m) => m.poster_url)
            );
          } catch {
          }
        }
      } catch (err) {
        console.error("Failed to load home data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  const heroMovies = trending.filter((m) => m.poster_url).slice(0, 8);

  const resetTimer = useCallback(() => {
    if (heroTimerRef.current) clearInterval(heroTimerRef.current);
    if (progressRef.current) {
      progressRef.current.style.transition = "none";
      progressRef.current.style.width = "0%";
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (progressRef.current) {
            progressRef.current.style.transition = "width 6s linear";
            progressRef.current.style.width = "100%";
          }
        });
      });
    }
    heroTimerRef.current = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % (heroMovies.length || 1));
    }, 6000);
  }, [heroMovies.length]);

  useEffect(() => {
    if (heroMovies.length > 0) resetTimer();
    return () => {
      if (heroTimerRef.current) clearInterval(heroTimerRef.current);
    };
  }, [heroMovies.length, resetTimer]);

  const goToSlide = (index) => {
    setHeroIndex(index);
    resetTimer();
  };

  const heroPrev = () => {
    setHeroIndex((prev) => (prev - 1 + heroMovies.length) % heroMovies.length);
    resetTimer();
  };

  const heroNext = () => {
    setHeroIndex((prev) => (prev + 1) % heroMovies.length);
    resetTimer();
  };

  const scrollCarousel = (ref, direction) => {
    if (ref.current) {
      ref.current.scrollBy({
        left: direction === "left" ? -320 : 320,
        behavior: "smooth",
      });
    }
  };

  const handleReshuffle = () => {
    setTrending(shuffleArray(allPopular));
  };

  const handleFeelLucky = async () => {
    if (randomizing) return;
    setRandomizing(true);
    try {
      const movies = allPopular.length > 0 ? allPopular : (await getPopular(50)).filter((m) => m.poster_url);
      if (movies.length > 0) {
        const pick = movies[Math.floor(Math.random() * movies.length)];
        navigate({ to: "/movie/$title", params: { title: pick.title } });
      }
    } catch {
    } finally {
      setRandomizing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background page-enter">
        {/* Hero skeleton */}
        <div className="relative h-[85vh] overflow-hidden">
          <div className="absolute inset-0 skeleton" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 via-35% to-transparent" />
          <div className="absolute bottom-20 left-8 md:left-16 flex flex-col gap-4">
            <div className="h-12 w-96 max-w-[70vw] skeleton" />
            <div className="flex gap-2">
              <div className="h-7 w-20 skeleton rounded-full" />
              <div className="h-7 w-24 skeleton rounded-full" />
            </div>
            <div className="h-11 w-36 skeleton rounded-lg" />
          </div>
        </div>
        {/* Grid skeleton */}
        <div className="max-w-[1600px] mx-auto px-6 md:px-12 pt-4 pb-16">
          <div className="h-8 w-48 skeleton mb-8" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 md:gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <MovieCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const currentHero = heroMovies[heroIndex];

  return (
    <div className="min-h-screen bg-background page-enter">
      {/* Hero Carousel */}
      {heroMovies.length > 0 && (
        <section className="relative h-[85vh] overflow-hidden">
          {heroMovies.map((movie, i) => (
            <div
              key={movie.movie_id}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                i === heroIndex ? "opacity-100 z-10" : "opacity-0 z-0"
              }`}
              aria-hidden={i !== heroIndex}
            >
              <img
                src={movie.poster_url}
                alt=""
                className={`w-full h-full object-cover object-top transition-transform duration-[8000ms] ease-out ${
                  i === heroIndex ? "scale-100" : "scale-[1.04]"
                }`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 via-30% to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-transparent to-transparent" />
            </div>
          ))}

          {/* Hero Content */}
          <div className="absolute inset-0 z-20 flex flex-col justify-end px-6 sm:px-8 md:px-16 pb-24">
            <div className="max-w-2xl">
              {/* Rating badge */}
              {currentHero?.vote_average && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-chart-1/20 border border-chart-1/30 rounded-full text-chart-1 text-xs font-bold mb-3">
                  <StarIcon size={12} weight="fill" />
                  {Number(currentHero.vote_average).toFixed(1)}
                </div>
              )}

              <h2
                key={currentHero?.movie_id}
                className="font-sans text-3xl sm:text-5xl md:text-7xl font-bold text-foreground leading-tight mb-3 animate-in fade-in slide-in-from-bottom-4 duration-500"
              >
                {currentHero?.title}
              </h2>

              <div className="flex flex-wrap items-center gap-2 mb-6">
                {currentHero?.genres &&
                  currentHero.genres
                    .split(",")
                    .slice(0, 3)
                    .map((g) => (
                      <span
                        key={g.trim()}
                        className="px-3 py-1 text-xs font-semibold uppercase tracking-wider border border-foreground/20 rounded-full text-foreground/80 bg-background/20 backdrop-blur-sm"
                      >
                        {g.trim()}
                      </span>
                    ))}
                {(currentHero?.release_year || currentHero?.year) && (
                  <span className="text-muted-foreground text-sm font-medium">
                    {currentHero.release_year || currentHero.year}
                  </span>
                )}
              </div>

              <button
                onClick={() =>
                  navigate({
                    to: "/movie/$title",
                    params: { title: currentHero?.title },
                  })
                }
                className="px-7 py-3.5 bg-foreground text-background font-bold text-sm uppercase tracking-wider rounded-xl hover:opacity-90 active:scale-[0.97] transition-all shadow-lg"
              >
                View Details
              </button>
            </div>
          </div>

          {/* Prev / Next buttons */}
          <button
            onClick={heroPrev}
            className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-30 w-11 h-11 flex items-center justify-center rounded-full bg-background/40 backdrop-blur-md border border-white/10 text-foreground hover:bg-background/70 active:scale-95 transition-all"
            aria-label="Previous slide"
          >
            <CaretLeftIcon size={20} weight="bold" />
          </button>
          <button
            onClick={heroNext}
            className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-30 w-11 h-11 flex items-center justify-center rounded-full bg-background/40 backdrop-blur-md border border-white/10 text-foreground hover:bg-background/70 active:scale-95 transition-all"
            aria-label="Next slide"
          >
            <CaretRightIcon size={20} weight="bold" />
          </button>

          {/* Dot indicators */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
            {heroMovies.map((movie, i) => (
              <button
                key={movie.movie_id}
                onClick={() => goToSlide(i)}
                aria-label={`Go to slide ${i + 1}: ${movie.title}`}
                className={`rounded-full transition-all duration-300 ${
                  i === heroIndex
                    ? "w-8 h-2 bg-foreground"
                    : "w-2 h-2 bg-foreground/30 hover:bg-foreground/60"
                }`}
              />
            ))}
          </div>
        </section>
      )}

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 pt-12 pb-16">
        {/* For You */}
        {user && forYou.length > 0 && (
          <section className="mb-20">
            <div className="flex items-center justify-between pb-4 mb-8">
              <div className="flex items-center gap-3 border-l-2 border-chart-1 pl-4">
                <SparkleIcon size={24} weight="duotone" className="text-chart-1" />
                <h2 className="font-sans text-2xl md:text-3xl font-bold text-foreground">
                  For You, {user.username}
                </h2>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <button
                  onClick={() => scrollCarousel(forYouRef, "left")}
                  className="p-2 rounded-full border border-border hover:bg-accent text-muted-foreground hover:text-foreground active:scale-95 transition-all"
                  aria-label="Scroll left"
                >
                  <CaretLeftIcon size={18} weight="bold" />
                </button>
                <button
                  onClick={() => scrollCarousel(forYouRef, "right")}
                  className="p-2 rounded-full border border-border hover:bg-accent text-muted-foreground hover:text-foreground active:scale-95 transition-all"
                  aria-label="Scroll right"
                >
                  <CaretRightIcon size={18} weight="bold" />
                </button>
              </div>
            </div>
            <div
              ref={forYouRef}
              className="flex gap-5 overflow-x-auto pb-6 snap-x snap-mandatory scrollbar-hide"
            >
              {forYou.map((movie) => (
                <div
                  key={movie.movie_id}
                  className="flex-none w-[180px] sm:w-[200px] md:w-[240px] snap-center"
                >
                  <MovieCard movie={movie} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Popular Movies */}
        <section className="mb-16">
          <div className="flex items-center justify-between pb-4 mb-8">
            <div className="flex items-center gap-3 border-l-2 border-chart-2 pl-4">
              <TrendUpIcon size={24} weight="bold" className="text-chart-2" />
              <h2 className="font-sans text-2xl md:text-3xl font-bold text-foreground">
                Popular Movies
              </h2>
            </div>
            <button
              onClick={handleReshuffle}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border hover:border-foreground/20 rounded-lg hover:bg-accent/50 transition-all"
              title="Reshuffle"
            >
              <ShuffleAngularIcon size={16} weight="bold" />
              <span className="hidden sm:inline">Shuffle</span>
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5 md:gap-6 stagger-grid">
            {trending.map((movie) => (
              <MovieCard key={movie.movie_id} movie={movie} />
            ))}
          </div>
        </section>

        {/* Feeling Lucky + Explore More */}
        <section className="mb-16 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={handleFeelLucky}
            disabled={randomizing}
            className="flex items-center gap-2.5 px-6 py-3.5 bg-muted border border-border rounded-xl font-semibold text-sm hover:bg-accent hover:border-foreground/20 active:scale-[0.97] transition-all disabled:opacity-60"
          >
            {randomizing ? (
              <SpinnerIcon size={18} weight="bold" className="animate-spin" />
            ) : (
              <ShuffleAngularIcon size={18} weight="bold" />
            )}
            Feeling Lucky?
          </button>
          <button
            onClick={() => navigate({ to: "/movies" })}
            className="flex items-center gap-2.5 px-6 py-3.5 bg-foreground text-background rounded-xl font-bold text-sm hover:opacity-90 active:scale-[0.97] transition-all"
          >
            Explore More
            <ArrowRightIcon size={16} weight="bold" />
          </button>
        </section>

        {/* CTA for non-logged-in users */}
        {!user && (
          <section className="mb-16">
            <div className="rounded-2xl border border-border bg-card p-8 sm:p-10 md:p-14 text-center">
              <PopcornIcon
                size={40}
                weight="duotone"
                className="text-foreground mx-auto mb-5"
              />
              <h3 className="font-sans text-2xl md:text-3xl font-bold text-foreground mb-3">
                Get Personalized Picks
              </h3>
              <p className="font-serif text-lg text-muted-foreground max-w-lg mx-auto mb-8">
                Sign up to unlock AI-powered recommendations tailored to your
                taste.
              </p>
              <button
                onClick={() => navigate({ to: "/register" })}
                className="px-8 py-3.5 bg-primary text-primary-foreground font-semibold uppercase tracking-wider text-sm rounded-lg hover:opacity-90 active:scale-[0.97] transition-all"
              >
                Create Free Account
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
