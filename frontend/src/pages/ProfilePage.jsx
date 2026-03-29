import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  getMyWatchlist,
  removeFromWatchlist,
  updateWatchlistStatus,
  getMyRatings,
  deleteRating,
} from "../api";
import { useAuth } from "../AuthContext";
import MovieCard, { MovieCardSkeleton } from "../components/MovieCard";
import {
  UserCircleIcon,
  BookmarkSimpleIcon,
  StarIcon,
  StarHalfIcon,
  TrashIcon,
  PlayIcon,
  EyeIcon,
  FilmReelIcon,
  CalendarBlankIcon,
} from "@phosphor-icons/react";

const TABS = [
  { key: "watchlist", label: "My Watchlist", icon: BookmarkSimpleIcon },
  { key: "ratings", label: "Rated Movies", icon: StarIcon },
];

const STATUS_OPTIONS = [
  { value: "want_to_watch", label: "Want to Watch", icon: BookmarkSimpleIcon, color: "text-foreground" },
  { value: "watching", label: "Watching", icon: PlayIcon, color: "text-chart-1" },
  { value: "watched", label: "Watched", icon: EyeIcon, color: "text-chart-2" },
];

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("watchlist");
  const [watchlist, setWatchlist] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    loadData();
  }, [user, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [wl, rt] = await Promise.all([
        getMyWatchlist().catch(() => []),
        getMyRatings().catch(() => []),
      ]);
      setWatchlist(wl);
      setRatings(rt);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveWatchlist = async (movieId) => {
    try {
      await removeFromWatchlist(movieId);
      setWatchlist((prev) => prev.filter((i) => i.movie_id !== movieId));
    } catch (err) {
      console.error("Remove error:", err);
    }
  };

  const handleStatusChange = async (movieId, newStatus) => {
    try {
      await updateWatchlistStatus(movieId, { status: newStatus });
      setWatchlist((prev) =>
        prev.map((i) => (i.movie_id === movieId ? { ...i, status: newStatus } : i))
      );
    } catch (err) {
      console.error("Status update error:", err);
    }
  };

  const handleDeleteRating = async (movieId) => {
    try {
      await deleteRating(movieId);
      setRatings((prev) => prev.filter((r) => r.movie_id !== movieId));
    } catch (err) {
      console.error("Delete rating error:", err);
    }
  };

  if (!user) return null;

  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  return (
    <div className="min-h-screen bg-background page-enter">
      {/* Profile Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-foreground flex items-center justify-center text-background text-3xl sm:text-4xl font-bold shrink-0">
              {user.username[0].toUpperCase()}
            </div>
            <div className="text-center sm:text-left">
              <h1 className="font-sans text-2xl sm:text-3xl md:text-4xl font-bold text-foreground leading-none">
                {user.username}
              </h1>
              <p className="text-muted-foreground text-sm mt-1.5">{user.email}</p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-4">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <BookmarkSimpleIcon size={16} weight="duotone" />
                  <span className="font-bold text-foreground">{watchlist.length}</span> watchlist
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <StarIcon size={16} weight="duotone" />
                  <span className="font-bold text-foreground">{ratings.length}</span> rated
                </div>
                {memberSince && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <CalendarBlankIcon size={16} weight="duotone" />
                    Joined {memberSince}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border sticky top-[57px] z-30 bg-background/95 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex gap-0" role="tablist">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 sm:px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
                    isActive
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                >
                  <Icon size={16} weight={isActive ? "fill" : "duotone"} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <MovieCardSkeleton key={i} />
            ))}
          </div>
        ) : activeTab === "watchlist" ? (
          <WatchlistTab
            items={watchlist}
            onRemove={handleRemoveWatchlist}
            onStatusChange={handleStatusChange}
            navigate={navigate}
          />
        ) : (
          <RatingsTab
            items={ratings}
            onDelete={handleDeleteRating}
            navigate={navigate}
          />
        )}
      </div>
    </div>
  );
}

function WatchlistTab({ items, onRemove, onStatusChange, navigate }) {
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? items : items.filter((i) => i.status === filter);

  return (
    <>
      {/* Status filter pills */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFilter("all")}
            className={`px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-full border transition-colors ${
              filter === "all"
                ? "bg-foreground text-background border-foreground"
                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
            }`}
          >
            All ({items.length})
          </button>
          {STATUS_OPTIONS.map((opt) => {
            const count = items.filter((i) => i.status === opt.value).length;
            if (count === 0) return null;
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-full border transition-colors ${
                  filter === opt.value
                    ? "bg-foreground text-background border-foreground"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                }`}
              >
                <Icon size={12} weight="fill" />
                {opt.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          message={
            items.length === 0
              ? "Your watchlist is empty. Search for movies and add them!"
              : "No movies match this filter."
          }
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5 stagger-grid">
          {filtered.map((item) => (
            <WatchlistCard
              key={item.movie_id}
              item={item}
              onRemove={onRemove}
              onStatusChange={onStatusChange}
              navigate={navigate}
            />
          ))}
        </div>
      )}
    </>
  );
}

function WatchlistCard({ item, onRemove, onStatusChange, navigate }) {
  const statusOpt = STATUS_OPTIONS.find((s) => s.value === item.status);
  const Icon = statusOpt?.icon || BookmarkSimpleIcon;

  return (
    <div className="group relative flex flex-col">
      {/* Movie card area */}
      <div
        className="cursor-pointer"
        onClick={() => navigate({ to: "/movie/$title", params: { title: item.title } })}
      >
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-muted border border-border/40 shadow-sm transition-all duration-500 group-hover:border-primary/40 group-hover:shadow-md">
          {item.poster_url ? (
            <img
              src={item.poster_url}
              alt={`${item.title} poster`}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
              <FilmReelIcon size={36} weight="thin" className="opacity-40" />
              <span className="text-[9px] font-semibold opacity-50 uppercase tracking-widest">No Poster</span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        </div>
      </div>

      {/* Info below poster */}
      <div className="flex flex-col gap-1.5 mt-3 px-0.5">
        <h3
          className="font-sans text-sm font-bold text-foreground leading-tight line-clamp-2 cursor-pointer hover:text-primary transition-colors"
          onClick={() => navigate({ to: "/movie/$title", params: { title: item.title } })}
        >
          {item.title}
        </h3>

        <div className="flex items-center justify-between gap-2">
          <div className={`flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider ${statusOpt?.color || "text-muted-foreground"}`}>
            <Icon size={12} weight="fill" />
            {statusOpt?.label}
          </div>
          <button
            onClick={() => onRemove(item.movie_id)}
            className="p-1 rounded text-muted-foreground/50 hover:text-destructive transition-colors"
            aria-label={`Remove ${item.title} from watchlist`}
          >
            <TrashIcon size={14} weight="bold" />
          </button>
        </div>

        <select
          value={item.status}
          onChange={(e) => onStatusChange(item.movie_id, e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="w-full px-2 py-1.5 bg-muted border border-border rounded text-[11px] font-semibold uppercase tracking-wider text-foreground cursor-pointer outline-none focus:ring-2 focus:ring-ring/30 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2212%22%20height%3D%2212%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M2%204l4%204%204-4%22%20fill%3D%22none%22%20stroke%3D%22%23999%22%20stroke-width%3D%222%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:calc(100%-0.5rem)_center] pr-6 hover:border-foreground/30 transition-colors"
          aria-label={`Change status for ${item.title}`}
        >
          <option value="want_to_watch">Want to Watch</option>
          <option value="watching">Watching</option>
          <option value="watched">Watched</option>
        </select>
      </div>
    </div>
  );
}

function RatingsTab({ items, onDelete, navigate }) {
  if (items.length === 0) {
    return (
      <EmptyState message="You haven't rated any movies yet. Watch a movie and share your thoughts!" />
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5 stagger-grid">
      {items.map((item) => (
        <div key={item.movie_id} className="group relative flex flex-col">
          <div
            className="cursor-pointer"
            onClick={() => navigate({ to: "/movie/$title", params: { title: item.title } })}
          >
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-muted border border-border/40 shadow-sm transition-all duration-500 group-hover:border-primary/40 group-hover:shadow-md">
              {item.poster_url ? (
                <img
                  src={item.poster_url}
                  alt={`${item.title} poster`}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <FilmReelIcon size={36} weight="thin" className="opacity-40" />
                  <span className="text-[9px] font-semibold opacity-50 uppercase tracking-widest">No Poster</span>
                </div>
              )}
              {/* Rating badge */}
              <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-black/70 backdrop-blur-sm rounded-full">
                <StarIcon size={12} weight="fill" className="text-chart-1" />
                <span className="text-[11px] font-bold text-white">{(item.score / 2).toFixed(1)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 mt-3 px-0.5">
            <h3
              className="font-sans text-sm font-bold text-foreground leading-tight line-clamp-2 cursor-pointer hover:text-primary transition-colors"
              onClick={() => navigate({ to: "/movie/$title", params: { title: item.title } })}
            >
              {item.title}
            </h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-chart-1">
                {Array.from({ length: 5 }).map((_, i) => {
                  const starVal = (i + 1) * 2;
                  const isHalf = item.score === starVal - 1;
                  const isFull = item.score >= starVal;
                  if (isFull) return <StarIcon key={i} size={10} weight="fill" />;
                  if (isHalf) return <StarHalfIcon key={i} size={10} weight="fill" />;
                  return <StarIcon key={i} size={10} weight="regular" className="opacity-30" />;
                })}
              </div>
              <button
                onClick={() => onDelete(item.movie_id)}
                className="p-1 rounded text-muted-foreground/50 hover:text-destructive transition-colors"
                aria-label={`Remove rating for ${item.title}`}
              >
                <TrashIcon size={14} weight="bold" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center border-2 border-dashed border-border rounded-xl bg-muted/30 min-h-[300px]">
      <FilmReelIcon size={56} weight="thin" className="text-muted-foreground opacity-30 mb-5" />
      <p className="font-serif text-lg text-muted-foreground max-w-md">{message}</p>
    </div>
  );
}
