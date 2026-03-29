import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { StarIcon, FilmReelIcon } from "@phosphor-icons/react";

export function MovieCardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <div className="aspect-[2/3] w-full rounded-lg skeleton" />
      <div className="flex flex-col gap-1.5 px-0.5">
        <div className="h-4 w-3/4 skeleton" />
        <div className="h-3 w-full skeleton" />
      </div>
    </div>
  );
}

export default function MovieCard({ movie }) {
  const navigate = useNavigate();
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleClick = () => {
    navigate({
      to: "/movie/$title",
      params: { title: movie.title },
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  const firstGenre = movie.genres ? movie.genres.split(",")[0]?.trim() : "";

  const formatRuntime = (minutes) => {
    if (!minutes || minutes <= 0) return null;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  const runtime = formatRuntime(movie.runtime);
  const year = movie.release_year && movie.release_year > 0 ? movie.release_year : null;

  return (
    <div
      className="group flex flex-col cursor-pointer transition-all duration-300 hover:-translate-y-1 gap-2"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`${movie.title}${movie.vote_average > 0 ? `, rated ${movie.vote_average.toFixed(1)}` : ""}${firstGenre ? `, ${firstGenre}` : ""}`}
      id={`movie-${movie.movie_id}`}
    >
      {/* Poster */}
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-muted border border-border/40 shadow-sm transition-all duration-500 group-hover:border-primary/40 group-hover:shadow-md group-hover:shadow-primary/10">
        {movie.poster_url && !imgError ? (
          <>
            {!imgLoaded && (
              <div className="absolute inset-0 skeleton" />
            )}
            <img
              src={movie.poster_url}
              alt={`${movie.title} poster`}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                imgLoaded ? "opacity-100" : "opacity-0"
              }`}
            />
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-muted gap-2">
            <FilmReelIcon size={40} weight="thin" className="opacity-40" />
            <span className="text-[10px] font-semibold opacity-50 uppercase tracking-widest">
              No Poster
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* Rating triangle badge — bottom right corner */}
        {movie.vote_average > 0 && (
          <div className="absolute bottom-0 right-0 w-14 h-14 overflow-hidden pointer-events-none">
            <div className="absolute bottom-0 right-0 w-0 h-0 border-b-[56px] border-l-[56px] border-b-black border-l-transparent" />
            <div className="absolute bottom-1 right-0.5 flex flex-col items-center justify-end w-7 h-7">
              <StarIcon size={9} weight="fill" className="text-yellow-500 mb-px" />
              <span className="text-[10px] font-bold text-yellow-500 leading-none">
                {movie.vote_average.toFixed(1)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1 px-0.5">
        <h3 className="font-sans text-sm font-bold text-foreground leading-tight line-clamp-1 transition-colors group-hover:text-primary">
          {movie.title}
        </h3>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {year && <span>{year}</span>}
          {year && runtime && <span className="text-border">•</span>}
          {runtime && <span>{runtime}</span>}
        </div>
      </div>
    </div>
  );
}
