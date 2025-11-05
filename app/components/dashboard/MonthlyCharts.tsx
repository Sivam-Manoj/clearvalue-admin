"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler
);

// Types matching the server payload
type MonthlyResponse = {
  months: string[];
  reports: { totals: number[]; byType: { Asset: number[]; RealEstate: number[]; Salvage: number[] } };
  users: { totals: number[] };
  deltas: {
    reports: { total: number; delta: number; percent: number };
    users: { total: number; delta: number; percent: number };
  };
};

export default function MonthlyCharts() {
  const [data, setData] = useState<MonthlyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/stats/monthly", { cache: "no-store" });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j?.message || "Failed to load monthly stats");
        setData(j);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Failed to load monthly stats";
        setError(message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const months = useMemo(() => data?.months || [], [data]);
  const reportTotals = useMemo(() => data?.reports?.totals || [], [data]);
  const userTotals = useMemo(() => data?.users?.totals || [], [data]);
  const byType = useMemo(() => data?.reports?.byType, [data]);

  const kpis = useMemo(() => {
    const rp = data?.deltas?.reports || { total: 0, delta: 0, percent: 0 };
    const us = data?.deltas?.users || { total: 0, delta: 0, percent: 0 };
    return [
      {
        label: "Reports (this month)",
        total: rp.total,
        delta: rp.delta,
        percent: rp.percent,
        up: rp.delta >= 0,
        color: "rose",
      },
      {
        label: "New Users (this month)",
        total: us.total,
        delta: us.delta,
        percent: us.percent,
        up: us.delta >= 0,
        color: "sky",
      },
    ];
  }, [data]);

  const lineData = useMemo(() => {
    return {
      labels: months,
      datasets: [
        {
          label: "Reports",
          data: reportTotals,
          borderColor: "rgba(244,63,94,0.9)", // rose-600
          backgroundColor: "rgba(244,63,94,0.15)",
          fill: true,
          tension: 0.35,
          pointRadius: 2,
          borderWidth: 2,
        },
        {
          label: "New Users",
          data: userTotals,
          borderColor: "rgba(2,132,199,0.9)", // sky-600
          backgroundColor: "rgba(2,132,199,0.12)",
          fill: true,
          tension: 0.35,
          pointRadius: 2,
          borderWidth: 2,
        },
      ],
    };
  }, [months, reportTotals, userTotals]);

  const lineOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: "#111827", boxWidth: 12 } },
      tooltip: { mode: "index" as const, intersect: false },
    },
    scales: {
      x: {
        ticks: { color: "#374151" },
        grid: { color: "rgba(0,0,0,0.05)" },
      },
      y: {
        ticks: { color: "#374151" },
        grid: { color: "rgba(0,0,0,0.06)" },
      },
    },
  }), []);

  const barData = useMemo(() => {
    return {
      labels: months,
      datasets: [
        {
          label: "Asset",
          data: byType?.Asset || [],
          backgroundColor: "rgba(2,132,199,0.7)",
          borderColor: "rgba(2,132,199,1)",
          borderWidth: 1,
        },
        {
          label: "RealEstate",
          data: byType?.RealEstate || [],
          backgroundColor: "rgba(5,150,105,0.7)",
          borderColor: "rgba(5,150,105,1)",
          borderWidth: 1,
        },
        {
          label: "Salvage",
          data: byType?.Salvage || [],
          backgroundColor: "rgba(217,119,6,0.8)",
          borderColor: "rgba(217,119,6,1)",
          borderWidth: 1,
        },
      ],
    };
  }, [months, byType]);

  const barOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: "#111827", boxWidth: 12 } },
      tooltip: { mode: "index" as const, intersect: false },
    },
    scales: {
      x: { stacked: true, ticks: { color: "#374151" }, grid: { display: false } },
      y: { stacked: true, ticks: { color: "#374151" }, grid: { color: "rgba(0,0,0,0.06)" } },
    },
  }), []);

  return (
    <section className="mt-8 grid grid-cols-1 gap-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-rose-200 bg-white/80 backdrop-blur p-4 shadow-lg shadow-rose-100">
            <div className="text-sm text-gray-600">{k.label}</div>
            <div className="mt-1 flex items-end justify-between">
              <div className="text-2xl font-semibold text-gray-900 tabular-nums">{loading ? "…" : k.total}</div>
              {!loading && (
                <div className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border ${
                  k.up ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
                }`}>
                  {k.up ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  )}
                  {Math.abs(k.percent).toFixed(1)}%
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Line chart */}
      <div className="rounded-2xl border border-rose-200 bg-white/80 backdrop-blur shadow-xl shadow-rose-100 p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Reports & Users (last 12 months)</h3>
        <div className="h-64 md:h-80">
          {error ? (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">{error}</div>
          ) : (
            <Line data={lineData} options={lineOptions} />
          )}
        </div>
      </div>

      {/* Stacked bar chart */}
      <div className="rounded-2xl border border-rose-200 bg-white/80 backdrop-blur shadow-xl shadow-rose-100 p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Reports by Type (last 12 months)</h3>
        <div className="h-64 md:h-80">
          {error ? (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">{error}</div>
          ) : (
            <Bar data={barData} options={barOptions} />
          )}
        </div>
      </div>
    </section>
  );
}
