"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function AdminNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        let res = await fetch("/api/admin/me", { cache: "no-store" });
        if (res.status === 401) {
          // Try silent refresh once
          const r = await fetch("/api/admin/refresh", {
            method: "POST",
            cache: "no-store",
          });
          if (r.ok) {
            res = await fetch("/api/admin/me", { cache: "no-store" });
          }
        }
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        if (!mounted) return;
        setRole(data?.user?.role || null);
      } catch {}
    })();

    // Periodic refresh every 20 minutes (buffer before 30m expiry)
    const id = setInterval(() => {
      fetch("/api/admin/refresh", { method: "POST", cache: "no-store" }).catch(
        () => {}
      );
    }, 20 * 60 * 1000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  async function onLogout() {
    try {
      setLoggingOut(true);
      await fetch("/api/admin/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  }

  const linkBase =
    "inline-flex items-center gap-2 px-3 py-2 rounded-xl transition-all cursor-pointer";
  const inactive =
    "text-gray-700 bg-white/70 border border-rose-200 hover:bg-rose-50 shadow-sm";
  const active = "text-rose-700 bg-rose-50 border border-rose-300 shadow";

  function NavLink({
    href,
    label,
    icon,
    onClick,
  }: {
    href: string;
    label: string;
    icon?: React.ReactNode;
    onClick?: () => void;
  }) {
    const isActive = pathname === href;
    return (
      <Link
        href={href}
        onClick={onClick}
        className={`${linkBase} ${isActive ? active : inactive}`}
      >
        {icon}
        <span className="hidden sm:inline">{label}</span>
        <span className="sm:hidden">{label}</span>
      </Link>
    );
  }

  return (
    <nav className="sticky top-0 z-40 backdrop-blur bg-white/75 border-b border-rose-200/80">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={role === "superadmin" ? "/dashboard" : "/gallery"}
            className="flex items-center gap-2"
          >
            <div className="h-9 w-9 rounded-xl bg-rose-500 shadow-md shadow-rose-200 ring-1 ring-rose-300 flex items-center justify-center text-white font-bold">
              CV
            </div>
            <div className="leading-tight">
              <div className="text-xs text-gray-500">ClearValue</div>
              <div className="text-sm font-semibold text-gray-900">Admin</div>
            </div>
          </Link>
        </div>
        {/* Hamburger (mobile) */}
        <button
          aria-label="Menu"
          onClick={() => setMenuOpen((m) => !m)}
          className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-xl bg-white/80 border border-rose-300 text-rose-700 shadow-sm hover:bg-rose-50 active:bg-rose-100 transition-all"
        >
          {menuOpen ? (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-2">
          {/* User and Admin see only Reports and Gallery */}
          {(role === "user" || role === "admin") ? (
            <>
              <NavLink
                href="/gallery"
                label="Image Gallery"
                icon={
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                }
              />
            </>
          ) : role === "superadmin" ? (
            <>
              <NavLink
                href="/dashboard"
                label="Dashboard"
                icon={
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 12l2-2 4 4 8-8 4 4" />
                  </svg>
                }
              />
              <NavLink
                href="/reports"
                label="Approved Reports"
                icon={
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                }
              />
              <NavLink
                href="/users"
                label="Users"
                icon={
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M7 21v-2a 4 4 0 0 1 3-3.87" />
                    <circle cx="10" cy="7" r="4" />
                  </svg>
                }
              />
              <NavLink
                href="/approvals"
                label="Pending Approvals"
                icon={
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                }
              />
              <NavLink
                href="/admins"
                label="Admins"
                icon={
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M16 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M7 21v-2a4 4 0 0 1 3-3.87" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M19 8a4 4 0 1 1-4-4" />
                  </svg>
                }
              />
              <NavLink
                href="/gallery"
                label="Image Gallery"
                icon={
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                }
              />
            </>
          ) : null}
        </div>
        {/* Desktop logout */}
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={onLogout}
            disabled={loggingOut}
            className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white text-rose-700 border border-rose-300 hover:bg-rose-50 active:bg-rose-100 shadow-sm hover:shadow transition-all disabled:opacity-60"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </div>

      {/* Mobile panel */}
      {menuOpen && (
        <div className="md:hidden border-t border-rose-200/80 bg-white/90 backdrop-blur shadow-inner">
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-2">
            {/* User and Admin see only Gallery */}
            {(role === "user" || role === "admin") ? (
              <>
                <NavLink
                  href="/gallery"
                  label="Image Gallery"
                  onClick={() => setMenuOpen(false)}
                  icon={
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  }
                />
              </>
            ) : role === "superadmin" ? (
              <>
                <NavLink
                  href="/dashboard"
                  label="Dashboard"
                  onClick={() => setMenuOpen(false)}
                  icon={
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 12l2-2 4 4 8-8 4 4" />
                    </svg>
                  }
                />
                <NavLink
                  href="/reports"
                  label="Approved Reports"
                  onClick={() => setMenuOpen(false)}
                  icon={
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  }
                />
                <NavLink
                  href="/users"
                  label="Users"
                  onClick={() => setMenuOpen(false)}
                  icon={
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M7 21v-2a4 4 0 0 1 3-3.87" />
                      <circle cx="10" cy="7" r="4" />
                    </svg>
                  }
                />
                <NavLink
                  href="/approvals"
                  label="Pending Approvals"
                  onClick={() => setMenuOpen(false)}
                  icon={
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M9 12l2 2 4-4" />
                    </svg>
                  }
                />
                <NavLink
                  href="/admins"
                  label="Admins"
                  onClick={() => setMenuOpen(false)}
                  icon={
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M16 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M7 21v-2a4 4 0 0 1 3-3.87" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M19 8a4 4 0 1 1-4-4" />
                    </svg>
                  }
                />
                <NavLink
                  href="/gallery"
                  label="Image Gallery"
                  onClick={() => setMenuOpen(false)}
                  icon={
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  }
                />
              </>
            ) : null}
            <button
              onClick={() => {
                setMenuOpen(false);
                onLogout();
              }}
              disabled={loggingOut}
              className="mt-1 cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white text-rose-700 border border-rose-300 hover:bg-rose-50 active:bg-rose-100 shadow-sm hover:shadow transition-all disabled:opacity-60"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              {loggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
