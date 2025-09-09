"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import MonthlyCharts from "@/components/dashboard/MonthlyCharts";
import Link from "next/link";

export default function DashboardShell() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [now, setNow] = useState<Date>(() => new Date());
  const [me, setMe] = useState<{
    email?: string;
    username?: string;
    role?: string;
  } | null>(null);
  const [stats, setStats] = useState<{
    totalUsers: number;
    totalAdmins: number;
    totalReports: number;
    byType: { Asset: number; RealEstate: number; Salvage: number };
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/me", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        setMe(data?.user || null);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setStatsLoading(true);
        const r = await fetch("/api/admin/stats", { cache: "no-store" });
        const j = await r.json().catch(() => ({}));
        if (r.ok) setStats(j);
      } finally {
        setStatsLoading(false);
      }
    })();
  }, []);

  const greeting = useMemo(() => {
    const h = now.getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }, [now]);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-rose-50">
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero Card with nested date/time sub-card */}
        <section className="relative overflow-hidden rounded-2xl border border-rose-200 bg-white/80 backdrop-blur shadow-xl shadow-rose-100 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 shrink-0 rounded-2xl bg-rose-500/90 ring-1 ring-rose-300/70 shadow-md shadow-rose-200 flex items-center justify-center text-white">
                {/* Calendar Icon */}
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-95"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
              <div>
                <h1
                  className="text-2xl md:text-3xl font-semibold text-gray-900 tracking-tight"
                  suppressHydrationWarning
                >
                  {greeting}
                  {me ? `, ${me.username || me.email}` : ", Admin"}
                </h1>
                <p className="mt-1 text-gray-600 max-w-2xl">
                  {me?.role ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-rose-50 text-rose-800 border-rose-200 mr-2">
                      {me.role}
                    </span>
                  ) : null}
                  Manage roles, users, and system configuration. Extend this
                  panel with actions and reports as needed.
                </p>
              </div>
            </div>
            {/* Date/Time sub-card */}
            <div className="md:min-w-[280px]">
              <div className="rounded-xl border border-rose-200/80 bg-white/70 backdrop-blur px-4 py-3 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-gray-700">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-rose-600"
                    >
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span className="font-medium" suppressHydrationWarning>
                      {now.toLocaleDateString(undefined, {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div
                    className="text-gray-900 font-semibold tabular-nums"
                    suppressHydrationWarning
                  >
                    {now.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Overview Stats */}
        <section className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Users */}
          <div className="rounded-2xl border border-rose-200 bg-white/80 backdrop-blur shadow-lg shadow-rose-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Users</div>
                <div className="mt-1 text-2xl font-semibold text-gray-900 tabular-nums" suppressHydrationWarning>
                  {statsLoading ? "…" : stats?.totalUsers ?? 0}
                </div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-700 border border-rose-200 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-3-3.87M7 21v-2a4 4 0 0 1 3-3.87" />
                  <circle cx="10" cy="7" r="4" />
                </svg>
              </div>
            </div>
          </div>

          {/* Admins */}
          <div className="rounded-2xl border border-rose-200 bg-white/80 backdrop-blur shadow-lg shadow-rose-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Admins</div>
                <div className="mt-1 text-2xl font-semibold text-gray-900 tabular-nums" suppressHydrationWarning>
                  {statsLoading ? "…" : stats?.totalAdmins ?? 0}
                </div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-700 border border-rose-200 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M7 21v-2a4 4 0 0 1 3-3.87" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Reports */}
          <div className="rounded-2xl border border-rose-200 bg-white/80 backdrop-blur shadow-lg shadow-rose-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Total Reports</div>
                <div className="mt-1 text-2xl font-semibold text-gray-900 tabular-nums" suppressHydrationWarning>
                  {statsLoading ? "…" : stats?.totalReports ?? 0}
                </div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-700 border border-rose-200 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
            </div>
          </div>

          {/* Asset Reports */}
          <div className="rounded-2xl border border-sky-200 bg-white/80 backdrop-blur shadow-lg shadow-sky-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Asset Reports</div>
                <div className="mt-1 text-2xl font-semibold text-gray-900 tabular-nums" suppressHydrationWarning>
                  {statsLoading ? "…" : stats?.byType?.Asset ?? 0}
                </div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-sky-500/10 text-sky-700 border border-sky-200 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </div>
            </div>
          </div>

          {/* Real Estate Reports */}
          <div className="rounded-2xl border border-emerald-200 bg-white/80 backdrop-blur shadow-lg shadow-emerald-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Real Estate Reports</div>
                <div className="mt-1 text-2xl font-semibold text-gray-900 tabular-nums" suppressHydrationWarning>
                  {statsLoading ? "…" : stats?.byType?.RealEstate ?? 0}
                </div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12l9-7 9 7" />
                  <path d="M9 21V9h6v12" />
                </svg>
              </div>
            </div>
          </div>

          {/* Salvage Reports */}
          <div className="rounded-2xl border border-amber-200 bg-white/80 backdrop-blur shadow-lg shadow-amber-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Salvage Reports</div>
                <div className="mt-1 text-2xl font-semibold text-gray-900 tabular-nums" suppressHydrationWarning>
                  {statsLoading ? "…" : stats?.byType?.Salvage ?? 0}
                </div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-700 border border-amber-200 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-rose-200 bg-white/80 backdrop-blur shadow-lg shadow-rose-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-2">Quick Actions</h3>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/reports"
                className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-rose-700 border border-rose-300 hover:bg-rose-50 active:bg-rose-100 shadow-sm hover:shadow transition-all"
              >
                {/* File icon */}
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
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                Reports
              </Link>
              {(me?.role === "admin" || me?.role === "superadmin") && (
                <Link
                  href="/approvals"
                  className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-rose-700 border border-rose-300 hover:bg-rose-50 active:bg-rose-100 shadow-sm hover:shadow transition-all"
                >
                  {/* Check Circle icon */}
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
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M9 12l2 2 4-4"></path>
                  </svg>
                  Approvals
                </Link>
              )}
              {me?.role === "superadmin" && (
                <Link
                  href="/admins"
                  className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-medium shadow-md hover:shadow-lg active:shadow-sm transition-all"
                >
                  {/* Users icon */}
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
                    <path d="M16 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M7 21v-2a4 4 0 0 1 3-3.87"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M19 8a4 4 0 1 1-4-4"></path>
                  </svg>
                  Manage Admins
                </Link>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-white/80 backdrop-blur shadow-lg shadow-rose-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-1">System Status</h3>
            <p className="text-sm text-gray-600">
              Hook up metrics or health checks.
            </p>
          </div>
        </section>

        {/* Monthly Charts */}
        <MonthlyCharts />
      </main>
    </div>
  );
}
