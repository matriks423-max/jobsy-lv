import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Menu,
  X,
  Plus,
  List,
  User,
  LogOut,
  Globe,
  Settings,
  Shield,
} from "lucide-react";

export default function Navbar() {
  const { locale, setLocale } = useLocale();
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`sticky top-0 z-50 border-b-2 border-ink bg-cream noise-bg transition-all duration-300${scrolled ? ' navbar-scrolled' : ''}`}>
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 lg:px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-1">
          <span className="font-display text-2xl font-bold italic text-ink">
            jobsy
          </span>
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: 'var(--coral)' }} />
        </Link>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-6 md:flex">
          <Link
            to="/browse"
            className="font-body text-sm font-medium text-ink-muted hover:text-ink"
          >
            {t(locale, "nav.browse")}
          </Link>
          <Link
            to="/pricing"
            className="font-body text-sm font-medium text-ink-muted hover:text-ink"
          >
            {t(locale, "nav.pricing")}
          </Link>
          {isAuthenticated && (
            <Link
              to="/my-posts"
              className="font-body text-sm font-medium text-ink-muted hover:text-ink"
            >
              {t(locale, "nav.myPosts")}
            </Link>
          )}
          <Button
            onClick={() => navigate("/create")}
            className="h-9 rounded-md border-2 border-ink bg-coral px-4 font-body text-sm font-medium text-ink hover:-translate-y-0.5 hover:bg-coral-hover hover:shadow-card-coral"
          >
            <Plus className="mr-1 h-4 w-4" />
            {t(locale, "nav.createPost")}
          </Button>
        </div>

        {/* Right side: Lang + Auth */}
        <div className="hidden items-center gap-4 md:flex">
          {/* Language switcher */}
          <div className="flex items-center gap-1">
            {(["lv", "ru", "en"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLocale(l)}
                className={`px-1.5 py-1 font-body text-sm font-medium ${
                  locale === l
                    ? "text-coral underline decoration-2 underline-offset-4"
                    : "text-ink-light hover:text-ink"
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Auth */}
          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full border-2 border-ink p-0.5 pr-3 transition hover:-translate-y-0.5">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt=""
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-coral-light">
                      <User className="h-4 w-4 text-coral" />
                    </div>
                  )}
                  <span className="font-body text-sm font-medium text-ink">
                    {user.name?.split(" ")[0] ?? "User"}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 border-2 border-ink bg-white"
              >
                <DropdownMenuItem onClick={() => navigate("/my-posts")}>
                  <List className="mr-2 h-4 w-4" />
                  {t(locale, "nav.myPosts")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/create")}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t(locale, "nav.createPost")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  {t(locale, "nav.settings")}
                </DropdownMenuItem>
                {user.role === "admin" && (
                  <DropdownMenuItem onClick={() => navigate("/admin")}>
                    <Shield className="mr-2 h-4 w-4 text-coral" />
                    Admin
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {t(locale, "nav.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="outline"
              onClick={() => navigate("/login")}
              className="h-9 rounded-md border-2 border-ink bg-transparent font-body text-sm font-medium text-ink hover:bg-cream-dark"
            >
              {t(locale, "nav.login")}
            </Button>
          )}
        </div>

        {/* Mobile hamburger */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild className="md:hidden">
            <button className="rounded-md border-2 border-ink p-2">
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-80 border-l-2 border-ink bg-cream p-0"
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b-2 border-ink p-4">
                <span className="font-display text-xl font-bold italic text-ink">
                  jobsy
                </span>
                <SheetClose asChild>
                  <button className="rounded-md border-2 border-ink p-2">
                    <X className="h-5 w-5" />
                  </button>
                </SheetClose>
              </div>
              <div className="flex flex-col gap-2 p-4">
                <Link
                  to="/browse"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg border-2 border-ink bg-white px-4 py-3 font-body font-medium text-ink"
                >
                  {t(locale, "nav.browse")}
                </Link>
                <Link
                  to="/pricing"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg border-2 border-ink bg-white px-4 py-3 font-body font-medium text-ink"
                >
                  {t(locale, "nav.pricing")}
                </Link>
                {isAuthenticated && (
                  <Link
                    to="/my-posts"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg border-2 border-ink bg-white px-4 py-3 font-body font-medium text-ink"
                  >
                    {t(locale, "nav.myPosts")}
                  </Link>
                )}
                <Link
                  to="/create"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg border-2 border-ink bg-coral px-4 py-3 font-body font-medium text-ink"
                >
                  <Plus className="mr-2 inline h-4 w-4" />
                  {t(locale, "nav.createPost")}
                </Link>
              </div>
              <div className="mt-auto border-t-2 border-ink p-4">
                <div className="mb-4 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-ink-muted" />
                  <div className="flex gap-1">
                    {(["lv", "ru", "en"] as const).map((l) => (
                      <button
                        key={l}
                        onClick={() => setLocale(l)}
                        className={`px-2 py-1 font-body text-sm font-medium ${
                          locale === l
                            ? "rounded bg-coral text-ink"
                            : "text-ink-muted"
                        }`}
                      >
                        {l.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                {isAuthenticated && user ? (
                  <div className="flex items-center gap-3">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-coral-light">
                        <User className="h-5 w-5 text-coral" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-body text-sm font-medium text-ink">
                        {user.name}
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => { navigate("/settings"); setMobileOpen(false); }}
                          className="font-body text-xs text-ink-light hover:text-ink"
                        >
                          {t(locale, "nav.settings")}
                        </button>
                        {user.role === "admin" && (
                          <button
                            onClick={() => { navigate("/admin"); setMobileOpen(false); }}
                            className="font-body text-xs text-coral hover:text-coral/70"
                          >
                            Admin
                          </button>
                        )}
                        <button
                          onClick={() => {
                            logout();
                            setMobileOpen(false);
                          }}
                          className="font-body text-xs text-ink-light hover:text-coral"
                        >
                          {t(locale, "nav.logout")}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={() => {
                      navigate("/login");
                      setMobileOpen(false);
                    }}
                    className="w-full rounded-md border-2 border-ink bg-coral font-body font-medium text-ink hover:bg-coral-hover"
                  >
                    {t(locale, "nav.login")}
                  </Button>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
