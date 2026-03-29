import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { useAuth } from "../AuthContext";
import { getGenres, getPopular, smartSearch, logSearch } from "../api";
import {
  MagnifyingGlassIcon,
  FilmSlateIcon,
  SignOutIcon,
  SignInIcon,
  UserPlusIcon,
  ListIcon,
  XIcon,
  UserCircleIcon,
  HouseIcon,
  FilmStripIcon,
  CaretDownIcon,
  CaretRightIcon,
  ShuffleAngularIcon,
  SpinnerIcon,
} from "@phosphor-icons/react";

function DropdownPoster({ url }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) {
    return (
      <div style={{ width: "36px", height: "52px", flexShrink: 0 }} className="bg-muted rounded flex items-center justify-center">
        <FilmSlateIcon size={16} className="text-muted-foreground" />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt=""
      style={{ width: "36px", height: "52px", objectFit: "cover", borderRadius: "4px", flexShrink: 0 }}
      onError={() => setFailed(true)}
    />
  );
}

export default function Navbar() {
  const [query, setQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [genreOpen, setGenreOpen] = useState(false);
  const [mobileGenreOpen, setMobileGenreOpen] = useState(false);
  const [genres, setGenres] = useState([]);
  const [randomizing, setRandomizing] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const menuRef = useRef(null);
  const genreRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    getGenres().then(setGenres).catch(() => {});
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!genreOpen) return;
    const handleClick = (e) => {
      if (genreRef.current && !genreRef.current.contains(e.target)) {
        setGenreOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [genreOpen]);

  useEffect(() => {
    if (!profileOpen) return;
    const handleClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [profileOpen]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setSuggestions([]);
      setDropdownOpen(false);
      return;
    }
    setSuggestLoading(true);
    setDropdownOpen(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await smartSearch(query.trim(), 6);
        setSuggestions(data || []);
      } catch {
        setSuggestions([]);
      } finally {
        setSuggestLoading(false);
      }
    }, 1000);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setDropdownOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  const closeDropdown = useCallback(() => {
    setDropdownOpen(false);
    setActiveIndex(-1);
    setSuggestions([]);
    setQuery("");
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      logSearch(query.trim());
      closeDropdown();
      navigate({ to: "/search", search: { q: query.trim() } });
      setMobileMenuOpen(false);
    }
  };

  const handleKeyDown = (e) => {
    if (!dropdownOpen || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const pick = suggestions[activeIndex];
      logSearch(query.trim(), pick.movie_id);
      closeDropdown();
      navigate({ to: "/movie/$title", params: { title: pick.title } });
    } else if (e.key === "Escape") {
      setDropdownOpen(false);
      setActiveIndex(-1);
    }
  };

  const handleRandomize = async () => {
    if (randomizing) return;
    setRandomizing(true);
    try {
      const movies = await getPopular(50);
      const withPosters = movies.filter((m) => m.poster_url);
      if (withPosters.length > 0) {
        const pick = withPosters[Math.floor(Math.random() * withPosters.length)];
        navigate({ to: "/movie/$title", params: { title: pick.title } });
      }
    } catch {
    } finally {
      setRandomizing(false);
    }
  };

  const navLinkClass =
    "flex items-center gap-1 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent/50";

  return (
    <>
      <nav
        className={`sticky top-0 z-50 relative flex items-center px-4 sm:px-6 py-3 transition-all duration-200 ${
          scrolled
            ? "bg-background/95 backdrop-blur-xl border-b border-border shadow-md"
            : "bg-background/80 backdrop-blur-xl border-b border-border"
        }`}
      >
        {/* Logo — left */}
        <div className="shrink-0">
          <Link
            to="/"
            className="font-sans text-xs font-bold uppercase tracking-[0.25em] text-foreground transition-colors"
          >
            Cine<span className="text-chart-1">Match</span>
          </Link>
        </div>

        {/* Desktop Nav Links — absolutely centered */}
        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-1">
          <Link to="/" className={navLinkClass}>
            <HouseIcon size={16} weight="bold" />
            Home
          </Link>

          {/* Genre Dropdown */}
          <div className="relative" ref={genreRef}>
            <button
              onClick={() => setGenreOpen(!genreOpen)}
              className={`${navLinkClass} ${genreOpen ? "text-foreground bg-accent/50" : ""}`}
            >
              <FilmStripIcon size={16} weight="bold" />
              Genre
              <CaretDownIcon
                size={12}
                weight="bold"
                className={`transition-transform duration-200 ${genreOpen ? "rotate-180" : ""}`}
              />
            </button>

            {genreOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[420px] bg-card border border-border rounded-xl shadow-2xl p-4 z-50 dropdown-enter">
                <div className="grid grid-cols-3 gap-0.5">
                  {genres.map((genre) => (
                    <Link
                      key={genre}
                      to="/movies"
                      search={{ genre }}
                      onClick={() => setGenreOpen(false)}
                      className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60 rounded-lg transition-colors"
                    >
                      {genre}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Link to="/movies" className={navLinkClass}>
            Movies
          </Link>
        </div>

        {/* Right section: search + randomizer + auth */}
        <div className="hidden md:flex items-center gap-2 shrink-0 ml-auto">
          {/* Randomizer button */}
          <button
            onClick={handleRandomize}
            disabled={randomizing}
            title="Random Movie"
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors disabled:opacity-50"
            aria-label="Pick a random movie"
          >
            {randomizing ? (
              <SpinnerIcon size={18} weight="bold" className="animate-spin" />
            ) : (
              <ShuffleAngularIcon size={18} weight="bold" />
            )}
          </button>

          {/* Search with live dropdown */}
          <div className="relative" ref={searchRef}>
            <form onSubmit={handleSearch}>
              <MagnifyingGlassIcon
                size={15}
                weight="bold"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search movies..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => query.trim() && suggestions.length > 0 && setDropdownOpen(true)}
                className="w-44 pl-9 pr-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring focus:w-56 transition-all duration-200"
                aria-label="Search movies"
                autoComplete="off"
              />
            </form>

            {/* Dropdown */}
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50 dropdown-enter">
                {suggestLoading ? (
                  <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                    <SpinnerIcon size={14} weight="bold" className="animate-spin" />
                    Searching...
                  </div>
                ) : suggestions.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-muted-foreground">
                    No results for &ldquo;{query}&rdquo;
                  </div>
                ) : (
                  <>
                    <div className="px-3 pt-3 pb-1">
                      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Movies
                      </span>
                    </div>
                    <ul>
                      {suggestions.map((movie, idx) => (
                        <li key={movie.movie_id}>
                          <button
                            onMouseDown={(e) => {
                              e.preventDefault();
                              logSearch(query.trim(), movie.movie_id);
                              closeDropdown();
                              navigate({ to: "/movie/$title", params: { title: movie.title } });
                            }}
                            onMouseEnter={() => setActiveIndex(idx)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                              idx === activeIndex ? "bg-accent" : "hover:bg-accent/60"
                            }`}
                          >
                            <DropdownPoster url={movie.poster_url} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {movie.title}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {movie.release_year || movie.year || ""}
                                {movie.genres ? ` · ${movie.genres.split(",")[0].trim()}` : ""}
                              </p>
                            </div>
                            {movie.vote_average && (
                              <span className="shrink-0 text-xs font-bold text-chart-1">
                                ★ {Number(movie.vote_average).toFixed(1)}
                              </span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                    <div className="border-t border-border">
                      <button
                        onMouseDown={(e) => {
                          e.preventDefault();
                          logSearch(query.trim());
                          closeDropdown();
                          navigate({ to: "/search", search: { q: query.trim() } });
                        }}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                      >
                        <span>View all results for &ldquo;{query}&rdquo;</span>
                        <MagnifyingGlassIcon size={14} weight="bold" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Auth */}
          {user ? (
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-muted border border-border rounded-full text-sm font-medium text-foreground hover:border-foreground/20 transition-colors cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-chart-1 flex items-center justify-center text-background text-xs font-bold">
                  {user.username[0].toUpperCase()}
                </div>
                <span>{user.username}</span>
                <CaretDownIcon
                  size={12}
                  weight="bold"
                  className={`text-muted-foreground transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`}
                />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50 dropdown-enter">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-medium text-foreground">{user.username}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{user.email || "Movie enthusiast"}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      to="/profile"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
                    >
                      <UserCircleIcon size={16} weight="bold" />
                      Profile
                    </Link>
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors text-left"
                    >
                      <SignOutIcon size={16} weight="bold" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors border border-transparent hover:border-border"
              >
                <SignInIcon size={16} weight="bold" />
                Login
              </Link>
              <Link
                to="/register"
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-lg hover:opacity-90 transition-opacity"
              >
                <UserPlusIcon size={16} weight="bold" />
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile Controls */}
        <div className="flex md:hidden items-center gap-1 ml-auto">
          <form onSubmit={handleSearch} className="relative">
            <MagnifyingGlassIcon
              size={16}
              weight="bold"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Search movies..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-36 sm:w-44 pl-9 pr-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/30 transition-all"
              aria-label="Search movies"
            />
          </form>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Open menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <XIcon size={20} weight="bold" />
            ) : (
              <ListIcon size={20} weight="bold" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden">
          <div
            ref={menuRef}
            className="absolute right-0 top-0 h-full w-72 bg-background border-l border-border p-6 slide-in-right flex flex-col gap-5"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-sans text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Menu
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-accent transition-colors"
                aria-label="Close menu"
              >
                <XIcon size={18} weight="bold" />
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent transition-colors"
              >
                <HouseIcon size={20} weight="duotone" />
                <span className="font-medium">Home</span>
              </Link>

              {/* Mobile Genre Accordion */}
              <button
                onClick={() => setMobileGenreOpen(!mobileGenreOpen)}
                className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-accent transition-colors w-full text-left"
              >
                <span className="flex items-center gap-3">
                  <FilmStripIcon size={20} weight="duotone" />
                  <span className="font-medium">Genre</span>
                </span>
                <CaretRightIcon
                  size={16}
                  weight="bold"
                  className={`text-muted-foreground transition-transform duration-200 ${mobileGenreOpen ? "rotate-90" : ""}`}
                />
              </button>

              {mobileGenreOpen && (
                <div className="ml-4 pl-4 border-l border-border flex flex-col gap-0.5 max-h-60 overflow-y-auto scrollbar-hide">
                  {genres.map((genre) => (
                    <Link
                      key={genre}
                      to="/movies"
                      search={{ genre }}
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setMobileGenreOpen(false);
                      }}
                      className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60 rounded-lg transition-colors"
                    >
                      {genre}
                    </Link>
                  ))}
                </div>
              )}

              <Link
                to="/movies"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent transition-colors"
              >
                <FilmSlateIcon size={20} weight="duotone" />
                <span className="font-medium">Movies</span>
              </Link>

              {/* Randomizer in mobile menu */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleRandomize();
                }}
                disabled={randomizing}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent transition-colors text-left w-full disabled:opacity-50"
              >
                {randomizing ? (
                  <SpinnerIcon size={20} weight="bold" className="animate-spin" />
                ) : (
                  <ShuffleAngularIcon size={20} weight="duotone" />
                )}
                <span className="font-medium">Random Movie</span>
              </button>

              <div className="border-t border-border my-2" />

              {user ? (
                <>
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    <UserCircleIcon size={20} weight="duotone" />
                    <span className="font-medium">Profile</span>
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-destructive hover:bg-destructive/10 transition-colors text-left w-full"
                  >
                    <SignOutIcon size={20} weight="bold" />
                    <span className="font-medium">Logout</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    <SignInIcon size={20} weight="bold" />
                    <span className="font-medium">Login</span>
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity mt-2"
                  >
                    <UserPlusIcon size={20} weight="bold" />
                    <span className="font-semibold">Sign Up</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
