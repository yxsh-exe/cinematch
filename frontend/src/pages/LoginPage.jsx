import { useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { login as loginApi } from "../api";
import { useAuth } from "../AuthContext";
import { EnvelopeSimpleIcon, LockIcon, SignInIcon, FilmSlateIcon, EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await loginApi(email, password);
      loginUser(data.access_token, data.user);
      navigate({ to: "/" });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[90vh] bg-background px-4 page-enter">
      <div className="w-full max-w-md p-8 sm:p-10 md:p-12 bg-card border border-border rounded-xl shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-3 mb-8">
          <FilmSlateIcon size={32} weight="duotone" className="text-foreground" />
          <div>
            <h1 className="font-sans text-2xl md:text-3xl font-bold text-foreground leading-none">
              Welcome back
            </h1>
            <p className="font-serif text-muted-foreground text-sm mt-1">
              Sign in to your CineMatch account
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-destructive/10 border-l-4 border-destructive text-destructive text-sm font-medium rounded-r-lg" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Email
            </label>
            <div className="relative">
              <EnvelopeSimpleIcon size={16} weight="duotone" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full pl-10 pr-4 py-3 bg-muted border border-border text-foreground text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-all placeholder:text-muted-foreground/60"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Password
            </label>
            <div className="relative">
              <LockIcon size={16} weight="duotone" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full pl-10 pr-11 py-3 bg-muted border border-border text-foreground text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-all placeholder:text-muted-foreground/60"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeSlashIcon size={16} /> : <EyeIcon size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 px-6 py-3 bg-primary text-primary-foreground text-sm font-semibold uppercase tracking-wider rounded-lg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <SignInIcon size={16} weight="bold" />
            )}
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link to="/register" className="text-foreground font-semibold underline underline-offset-4 hover:opacity-70 transition-opacity">
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
}
