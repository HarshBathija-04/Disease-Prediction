import { Loader2, LogOut, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Navigate, NavLink, Outlet, useLocation } from "react-router";
import { Toaster } from "sonner";
import { onSlowRequests } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { Role } from "../lib/types";
import { Logo } from "./brand";
import { buttonClass, cx } from "./ui";

function WakeBanner() {
  const [slow, setSlow] = useState(false);
  useEffect(() => onSlowRequests(setSlow), []);
  if (!slow) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-4 z-50 mx-auto flex w-[calc(100%-2rem)] max-w-md animate-enter items-start gap-3 rounded-lg border border-line bg-surface p-4 text-sm shadow-raised"
    >
      <Loader2 className="mt-0.5 size-5 shrink-0 animate-spin text-brand" aria-hidden />
      <p>
        <strong className="font-semibold">Waking up the server…</strong>
        <span className="block text-muted">
          The free-tier API sleeps when idle. The first request can take up to a minute.
        </span>
      </p>
    </div>
  );
}

const navFor = (role: Role | null | undefined) =>
  role === "doctor"
    ? [
        { to: "/app", label: "Dashboard", end: true },
        { to: "/app/appointments", label: "Consultations" },
        { to: "/app/predictions", label: "Patient reports" },
      ]
    : role === "patient"
      ? [
          { to: "/app", label: "Dashboard", end: true },
          { to: "/app/check", label: "Check symptoms" },
          { to: "/doctors", label: "Doctors" },
          { to: "/app/appointments", label: "Consultations" },
        ]
      : [{ to: "/doctors", label: "Doctors" }];

function Header() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  // Close the mobile menu on navigation.
  const [path, setPath] = useState(location.pathname);
  if (path !== location.pathname) {
    setPath(location.pathname);
    setOpen(false);
  }
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  const links = navFor(user?.role);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cx(
      "rounded-md px-3 py-2 text-[15px] font-medium transition-colors duration-150",
      isActive ? "bg-brand-soft text-brand-strong" : "text-muted hover:bg-sunken hover:text-ink",
    );

  const accountActions = user ? (
    <>
      <NavLink to="/app/profile" className={linkClass}>
        {user.profile?.name.split(" ")[0] ?? user.username}
      </NavLink>
      <button type="button" onClick={logout} className={buttonClass("ghost", "sm", "text-muted")}>
        <LogOut className="size-4" aria-hidden /> Sign out
      </button>
    </>
  ) : (
    <>
      <Link to="/login" className={buttonClass("ghost", "sm")}>
        Sign in
      </Link>
      <Link to="/register" className={buttonClass("primary", "sm")}>
        Get started
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link to={user ? "/app" : "/"} className="rounded-md" aria-label="Symptra home">
          <Logo />
        </Link>
        <nav aria-label="Main" className="ml-6 hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={"end" in link ? link.end : false} className={linkClass}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-1 md:flex">{accountActions}</div>
        <button
          type="button"
          className={buttonClass("ghost", "sm", "ml-auto size-11 px-0 md:hidden")}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
        </button>
      </div>
      {open && (
        <nav
          id="mobile-nav"
          aria-label="Mobile"
          className="animate-enter border-t border-line bg-paper px-4 pb-4 md:hidden"
        >
          <div className="flex flex-col gap-1 pt-3">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={"end" in link ? link.end : false}
                className={linkClass}
              >
                {link.label}
              </NavLink>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
            {accountActions}
          </div>
        </nav>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          <span className="font-semibold text-ink">Symptra</span> · Educational tool, not a substitute for
          professional medical advice.
        </p>
        <p>
          Built by{" "}
          <a
            className="font-medium text-brand underline-offset-4 hover:underline"
            href="https://github.com/HarshBathija-04"
          >
            Harsh Bathija
          </a>
        </p>
      </div>
    </footer>
  );
}

export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-brand px-4 py-2 font-semibold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <Header />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 sm:px-6 sm:pt-12">
        <Outlet />
      </main>
      <Footer />
      <WakeBanner />
      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}

/** Route guard: renders the nested routes for signed-in users (optionally of one role). */
export function RequireAuth({ role }: { role?: Role }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready)
    return (
      <div className="grid place-items-center py-24" role="status" aria-label="Loading your account">
        <Loader2 className="size-6 animate-spin text-brand" aria-hidden />
      </div>
    );
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (role && user.role !== role) return <Navigate to="/app" replace />;
  return <Outlet />;
}
