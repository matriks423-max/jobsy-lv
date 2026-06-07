import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import {
  Sheet,
  SheetContent,
  SheetTitle,
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
import MagneticButton from "@/components/premium/MagneticButton";
import BrandIcon from "@/components/BrandIcon";

export default function Navbar() {
  const { locale, setLocale } = useLocale();
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav
      className={`sticky top-0 z-50 bg-surface-off-white transition-all duration-300 ${
        scrolled ? "navbar-scrolled" : "shadow-nav"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-container-max-width items-center justify-between px-margin-desktop">
        {/* Logo */}
        <div className="flex items-center gap-stack-gap-lg">
          <Link to="/" className="flex items-center gap-2">
            <BrandIcon className="h-8 w-8 rounded-lg" />
            <span className="font-headline text-headline-sm font-bold text-primary">
              Jobsy
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden items-center gap-stack-gap-md md:flex">
            <Link
              to="/browse"
              className={`font-label text-label-md transition-colors duration-200 ${
                isActive("/browse")
                  ? "border-b-2 border-primary pb-0.5 font-bold text-primary"
                  : "text-on-surface-variant hover:text-primary"
              }`}
            >
              {t(locale, "nav.browse")}
            </Link>
            <Link
              to="/pricing"
              className={`font-label text-label-md transition-colors duration-200 ${
                isActive("/pricing")
                  ? "border-b-2 border-primary pb-0.5 font-bold text-primary"
                  : "text-on-surface-variant hover:text-primary"
              }`}
            >
              {t(locale, "nav.pricing")}
            </Link>
            {isAuthenticated && (
              <Link
                to="/my-posts"
                className={`font-label text-label-md transition-colors duration-200 ${
                  isActive("/my-posts")
                    ? "border-b-2 border-primary pb-0.5 font-bold text-primary"
                    : "text-on-surface-variant hover:text-primary"
                }`}
              >
                {t(locale, "nav.myPosts")}
              </Link>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="hidden items-center gap-stack-gap-md md:flex">
          {/* Language switcher */}
          <div className="flex items-center gap-0.5 rounded-lg border border-outline-variant bg-surface-cream p-0.5">
            {(["lv", "ru", "en"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLocale(l)}
                className={`rounded-md px-2.5 py-1 font-label text-label-sm font-semibold transition-all duration-150 ${
                  locale === l
                    ? "bg-primary text-white shadow-sm"
                    : "text-on-surface-variant hover:bg-white hover:text-primary"
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
                <button className="flex items-center gap-2 rounded-lg border border-outline px-3 py-1.5 transition-all duration-200 hover:border-primary hover:bg-surface-cream">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt=""
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-cream text-primary">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                  <span className="font-label text-label-md font-medium text-on-surface">
                    {user.name?.split(" ")[0] ?? "User"}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 border border-outline-variant bg-white shadow-card"
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
                    <Shield className="mr-2 h-4 w-4 text-accent-coral" />
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
            <button
              onClick={() => navigate("/login")}
              className="px-4 py-2 font-label text-label-md text-on-surface-variant transition-colors duration-200 hover:rounded-lg hover:bg-surface-cream hover:text-primary"
            >
              {t(locale, "nav.login")}
            </button>
          )}

          {/* CTA */}
          <MagneticButton strength={0.4}>
            <button
              onClick={() => navigate("/create")}
              className="rounded-lg bg-accent-coral px-6 py-2.5 font-label text-label-md font-bold text-on-surface shadow-sm transition-all duration-300 hover:bg-accent-coral-hover hover:scale-[1.03] hover:shadow-md active:scale-95"
            >
              {t(locale, "nav.createPost")}
            </button>
          </MagneticButton>
        </div>

        {/* Mobile language switcher — visible in bar */}
        <div className="flex items-center gap-0.5 md:hidden">
          {(["lv", "ru", "en"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLocale(l)}
              className={`rounded-md px-2 py-1 font-label text-label-sm font-semibold transition-colors ${
                locale === l
                  ? "bg-primary text-white"
                  : "text-on-surface-variant hover:text-primary"
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Mobile hamburger */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild className="md:hidden">
            <button aria-label={t(locale, "nav.menu")} className="rounded-lg border border-outline p-2 text-on-surface transition-colors hover:border-primary hover:bg-surface-cream">
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-80 border-l border-outline-variant bg-surface-off-white p-0"
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-outline-variant p-4">
                <SheetTitle className="flex items-center gap-2 font-headline text-xl font-bold text-primary">
                  <BrandIcon className="h-7 w-7 rounded-md" />
                  Jobsy
                </SheetTitle>
                <SheetClose asChild>
                  <button className="rounded-lg border border-outline p-2 text-on-surface transition-colors hover:border-primary">
                    <X className="h-5 w-5" />
                  </button>
                </SheetClose>
              </div>
              <div className="flex flex-col gap-2 p-4">
                {/* Language switcher — prominent at top of menu */}
                <div className="mb-1 flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-cream px-3 py-2">
                  <Globe className="h-4 w-4 shrink-0 text-on-surface-variant" />
                  <span className="font-label text-label-sm text-on-surface-variant">
                    {t(locale, "nav.language")}
                  </span>
                  <div className="ml-auto flex gap-1">
                    {(["lv", "ru", "en"] as const).map((l) => (
                      <button
                        key={l}
                        onClick={() => setLocale(l)}
                        className={`rounded-md px-3 py-1 font-label text-label-sm font-semibold transition-colors ${
                          locale === l
                            ? "bg-primary text-white"
                            : "text-on-surface-variant hover:bg-white hover:text-primary"
                        }`}
                      >
                        {l.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <Link
                  to="/browse"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg bg-white px-4 py-3 font-label text-label-md font-medium text-on-surface shadow-card transition-colors hover:bg-surface-cream"
                >
                  {t(locale, "nav.browse")}
                </Link>
                <Link
                  to="/pricing"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg bg-white px-4 py-3 font-label text-label-md font-medium text-on-surface shadow-card transition-colors hover:bg-surface-cream"
                >
                  {t(locale, "nav.pricing")}
                </Link>
                {isAuthenticated && (
                  <Link
                    to="/my-posts"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg bg-white px-4 py-3 font-label text-label-md font-medium text-on-surface shadow-card transition-colors hover:bg-surface-cream"
                  >
                    {t(locale, "nav.myPosts")}
                  </Link>
                )}
                <Link
                  to="/create"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-lg bg-accent-coral px-4 py-3 font-label text-label-md font-bold text-on-surface transition-all hover:bg-accent-coral-hover"
                >
                  <Plus className="h-4 w-4" />
                  {t(locale, "nav.createPost")}
                </Link>
              </div>
              <div className="mt-auto border-t border-outline-variant p-4">
                {isAuthenticated && user ? (
                  <div className="flex items-center gap-3">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-cream text-primary">
                        <User className="h-5 w-5" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-label text-label-md font-medium text-on-surface">
                        {user.name}
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => { navigate("/settings"); setMobileOpen(false); }}
                          className="font-label text-label-sm text-on-surface-variant hover:text-primary"
                        >
                          {t(locale, "nav.settings")}
                        </button>
                        {user.role === "admin" && (
                          <button
                            onClick={() => { navigate("/admin"); setMobileOpen(false); }}
                            className="font-label text-label-sm text-accent-coral"
                          >
                            Admin
                          </button>
                        )}
                        <button
                          onClick={() => { logout(); setMobileOpen(false); }}
                          className="font-label text-label-sm text-on-surface-variant hover:text-primary"
                        >
                          {t(locale, "nav.logout")}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { navigate("/login"); setMobileOpen(false); }}
                    className="w-full rounded-lg border border-outline bg-white px-4 py-2.5 font-label text-label-md font-medium text-on-surface shadow-card transition-colors hover:bg-surface-cream"
                  >
                    {t(locale, "nav.login")}
                  </button>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
