import { type FC, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { LOGIN_PATH, REGISTER_PATH } from "@/router/roleNavigation";
import type { UserRole } from "@/types";
import { config } from "@/config/env";

type NavItem = 
  | { label: string; to: string; external?: false }
  | { label: string; href: string; external: true };

const docsNavItem = (href: string): NavItem => ({
  label: "Help",
  href,
  external: true,
});

const ROLE_NAV_ITEMS: Record<UserRole, NavItem[]> = {
  USER: [
    { label: "Home", to: "/user" },
    { label: "Session", to: "/user/session" },
    { label: "Recent", to: "/user/recent" },
    { label: "Stations", to: "/user/stations" },
    { label: "Profile", to: "/user/profile" },
  ],
  SUPPORT: [
    { label: "Home", to: "/support" },
    { label: "Logs", to: "/support/logs?resolved=false" },
    { label: "Stations", to: "/support/stations" },
    { label: "Sessions", to: "/support/sessions" },
  ],
  ADMIN: [
    { label: "Home", to: "/admin" },
    { label: "Logs", to: "/admin/logs?resolved=false" },
    { label: "Users", to: "/admin/users" },
    { label: "Stations", to: "/admin/stations" },
  ],
};

const GUEST_NAV_ITEMS: NavItem[] = [
  { label: "Login", to: LOGIN_PATH },
  { label: "Register", to: REGISTER_PATH },
];

const NavMenu: FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navItems = useMemo(() => {
    const base = user ? ROLE_NAV_ITEMS[user.userRole] : GUEST_NAV_ITEMS;
    if (!config.docsUrl) return base;
    return [...base, docsNavItem(config.docsUrl)];
  }, [user]);
  const closeMobileMenu = () => {
    setIsMobileOpen(false);
  };

  const identity = user?.email ?? "Guest";

  const handleLogin = () => {
    closeMobileMenu();
    navigate(LOGIN_PATH);
  };

  const handleLogout = async () => {
    closeMobileMenu();
    await signOut();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="truncate text-sm font-medium text-slate-600">
            {identity}
          </span>
        </div>

        <button
          type="button"
          className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700 md:hidden"
          onClick={() => setIsMobileOpen((prev) => !prev)}
          aria-expanded={isMobileOpen}
          aria-label="Toggle navigation menu"
        >
          Menu
        </button>

        <div className="hidden items-center gap-3 md:flex">
          {navItems.map((item) => {
            return "external" in item && item.external ? (
                  <a
                    key={item.href}
                    href={item.href}
                    className="rounded-md px-2.5 py-1 text-sm font-medium no-underline text-slate-700 hover:bg-slate-100"
                  >
                    {item.label}
                  </a>
                ) : (
              <Link
                key={item.to}
                to={item.to}
                className={`rounded-md px-2.5 py-1 text-sm font-medium no-underline ${
                  location.pathname === item.to
                    ? "bg-slate-800 text-white hover:bg-slate-900 hover:text-white"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          {user ? (
            <button type="button" onClick={handleLogout}>
              Logout
            </button>
          ) : (
            <button type="button" onClick={handleLogin}>
              Login
            </button>
          )}
        </div>
      </nav>

      {isMobileOpen && (
        <div className="border-t border-slate-200 px-4 pb-4 md:hidden">
          <div className="flex flex-col gap-2 pt-3">
            {navItems.map((item) => {
              return "external" in item && item.external ? (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={closeMobileMenu}
                    className="rounded-md px-2.5 py-1 text-sm font-medium no-underline text-slate-700 hover:bg-slate-100"
                  >
                    {item.label}
                  </a>
                ) : (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={closeMobileMenu}
                  className={`rounded-md px-3 py-2 text-sm font-medium no-underline ${
                    location.pathname === item.to
                      ? "bg-slate-800 text-white hover:bg-slate-900 hover:text-white"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            {user ? (
              <button type="button" onClick={handleLogout}>
                Logout
              </button>
            ) : (
              <button type="button" onClick={handleLogin}>
                Login
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default NavMenu;