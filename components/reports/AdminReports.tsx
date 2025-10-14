"use client";

import { useEffect, useMemo, useState } from "react";
import ConfirmModal from "@/components/common/ConfirmModal";

type ReportItem = {
  _id: string;
  filename: string;
  address: string;
  fairMarketValue: string;
  user?: { email?: string; username?: string } | null;
  reportType: "RealEstate" | "Salvage" | "Asset" | string;
  createdAt: string;
  reportModel?: string;
  fileType?: "pdf" | "docx" | "xlsx" | "images";
  approvalStatus?: "pending" | "approved" | "rejected";
  contract_no?: string;
};

type ApiResponse = {
  items: ReportItem[];
  total: number;
  page: number;
  limit: number;
};

export default function AdminReports() {
  // Filters
  const [q, setQ] = useState("");
  const [reportType, setReportType] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(20);

  // Data
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  function formatFMV(value: string) {
    // Try to parse number safely and format as currency
    const numeric = Number(String(value).replace(/[^\d.-]/g, ""));
    if (!isNaN(numeric)) {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(numeric);
    }
    return value;
  }

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (reportType) p.set("reportType", reportType);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (userEmail) p.set("userEmail", userEmail.trim());
    p.set("page", String(page));
    p.set("limit", String(limit));
    return p.toString();
  }, [q, reportType, from, to, userEmail, page, limit]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reports?${queryString}`, {
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to load reports");
      setData(json as ApiResponse);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to load reports";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  function openDelete(id: string) {
    setPendingDeleteId(id);
    setConfirmOpen(true);
  }

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/admin/reports/${pendingDeleteId}`, {
        method: "DELETE",
      });
      if (!(res.ok || res.status === 204)) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message || "Failed to delete");
      }
      setConfirmOpen(false);
      setPendingDeleteId(null);
      await load();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to delete report";
      setError(message);
    } finally {
      setDeleting(false);
    }
  }

  function onReset() {
    setQ("");
    setReportType("");
    setFrom("");
    setTo("");
    setUserEmail("");
    setPage(1);
  }

  const totalPages = useMemo(() => {
    return data
      ? Math.max(1, Math.ceil((data.total || 0) / (data.limit || limit)))
      : 1;
  }, [data, limit]);

  type Group = {
    key: string;
    title: string;
    contract_no?: string;
    reportType: string;
    createdAt: string;
    fairMarketValue: string;
    userEmail?: string;
    variants: { pdf?: ReportItem; docx?: ReportItem; xlsx?: ReportItem; images?: ReportItem };
  };

  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Group>();
    const items = (data?.items || []) as ReportItem[];
    for (const r of items) {
      const key = String(((r as any).report as string | undefined) || r._id);
      let g = map.get(key);
      if (!g) {
        const base = r.reportType === "RealEstate" ? "Real Estate" : r.reportType === "Salvage" ? "Salvage" : "Asset";
        const title = r.contract_no ? `${base} - ${r.contract_no}` : (r.address || base);
        g = {
          key,
          title,
          contract_no: r.contract_no,
          reportType: r.reportType,
          createdAt: r.createdAt,
          fairMarketValue: r.fairMarketValue,
          userEmail: r.user?.email || undefined,
          variants: {},
        };
        map.set(key, g);
      }
      if (new Date(r.createdAt).getTime() > new Date(g.createdAt).getTime()) g.createdAt = r.createdAt;
      const ft = ((r.fileType || r.filename.split(".").pop() || "") as string).toLowerCase();
      if (ft === "pdf") g.variants.pdf = r;
      else if (ft === "docx") g.variants.docx = r;
      else if (ft === "xlsx") g.variants.xlsx = r;
      else if (ft === "images" || ft === "zip") g.variants.images = r;
    }
    return Array.from(map.values());
  }, [data]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-rose-50">
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Hero Summary */}
        <section className="rounded-2xl border border-rose-200 bg-white/80 backdrop-blur shadow-xl shadow-rose-100 p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
                Report Library
              </h1>
              <p className="text-gray-600">
                Search and filter reports. View who created them and when.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="rounded-xl border border-rose-200 bg-white/70 px-4 py-2 shadow-sm">
                <div className="text-xs text-gray-600">Results</div>
                <div className="text-lg font-semibold text-gray-900">
                  {data?.total ?? 0}
                </div>
              </div>
              <div className="rounded-xl border border-rose-200 bg-white/70 px-4 py-2 shadow-sm hidden sm:block">
                <div className="text-xs text-gray-600">Page</div>
                <div className="text-lg font-semibold text-gray-900">
                  {page}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="rounded-2xl border border-rose-200 bg-white/80 backdrop-blur shadow-lg shadow-rose-100 p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Search
              </label>
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Filename or address"
                className="mt-1 w-full rounded-xl border border-gray-300 hover:border-gray-400 focus:border-rose-400 focus:ring-rose-400 shadow-sm px-3 py-2.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Type
              </label>
              <select
                value={reportType}
                onChange={(e) => {
                  setReportType(e.target.value);
                  setPage(1);
                }}
                className="mt-1 w-full rounded-xl border border-gray-300 hover:border-gray-400 focus:border-rose-400 focus:ring-rose-400 shadow-sm px-3 py-2.5"
              >
                <option value="">All</option>
                <option value="RealEstate">Real Estate</option>
                <option value="Salvage">Salvage</option>
                <option value="Asset">Asset</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                From
              </label>
              <input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPage(1);
                }}
                className="mt-1 w-full rounded-xl border border-gray-300 hover:border-gray-400 focus:border-rose-400 focus:ring-rose-400 shadow-sm px-3 py-2.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                To
              </label>
              <input
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPage(1);
                }}
                className="mt-1 w-full rounded-xl border border-gray-300 hover:border-gray-400 focus:border-rose-400 focus:ring-rose-400 shadow-sm px-3 py-2.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Created By (email)
              </label>
              <input
                value={userEmail}
                onChange={(e) => {
                  setUserEmail(e.target.value);
                  setPage(1);
                }}
                placeholder="user@example.com"
                className="mt-1 w-full rounded-xl border border-gray-300 hover:border-gray-400 focus:border-rose-400 focus:ring-rose-400 shadow-sm px-3 py-2.5"
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => load()}
              className="cursor-pointer inline-flex items-center px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-medium shadow-md hover:shadow-lg active:shadow-sm transition-all"
            >
              Apply
            </button>
            <button
              onClick={onReset}
              className="cursor-pointer inline-flex items-center px-4 py-2 rounded-xl border border-rose-300 text-rose-700 bg-white hover:bg-rose-50 active:bg-rose-100 shadow-sm hover:shadow transition-all"
            >
              Reset
            </button>
          </div>
        </section>

        {/* List */}
        <section className="rounded-2xl border border-rose-200 bg-white/80 backdrop-blur shadow-lg shadow-rose-100 p-4 md:p-6">
          {loading ? (
            <div className="text-gray-500">Loading...</div>
          ) : error ? (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
              {error}
            </div>
          ) : (
            <>
              {/* Table on md+ */}
              <div className="overflow-x-auto hidden md:block">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="text-gray-600">
                      <th className="py-2 pr-4">Report</th>
                      <th className="py-2 pr-4">Contract No</th>
                      <th className="py-2 pr-4">FMV</th>
                      <th className="py-2 pr-4">Type</th>
                      <th className="py-2 pr-4">Created At</th>
                      <th className="py-2 pr-4">Created By</th>
                      <th className="py-2 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((g) => (
                      <tr key={g.key} className="border-t border-rose-100/70 hover:bg-rose-50/40">
                        <td className="py-2 pr-4 text-gray-900">{g.title}</td>
                        <td className="py-2 pr-4 text-gray-700">{g.contract_no || "-"}</td>
                        <td className="py-2 pr-4">{formatFMV(g.fairMarketValue)}</td>
                        <td className="py-2 pr-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${g.reportType === "RealEstate" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : g.reportType === "Salvage" ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-sky-50 text-sky-800 border-sky-200"}`}>{g.reportType}</span>
                        </td>
                        <td className="py-2 pr-4 text-gray-700">{new Date(g.createdAt).toLocaleString()}</td>
                        <td className="py-2 pr-4 text-gray-700">{g.userEmail || "-"}</td>
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-2">
                            <a href={g.variants.pdf && g.variants.pdf.approvalStatus === 'approved' ? `/api/admin/reports/${g.variants.pdf._id}/download` : undefined} className={`cursor-pointer inline-flex items-center justify-center rounded-xl px-2.5 py-1.5 text-xs font-semibold shadow-sm ${g.variants.pdf && g.variants.pdf.approvalStatus === 'approved' ? 'bg-blue-600 text-white hover:bg-blue-500 hover:shadow' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>PDF</a>
                            <a href={g.variants.docx && g.variants.docx.approvalStatus === 'approved' ? `/api/admin/reports/${g.variants.docx._id}/download` : undefined} className={`cursor-pointer inline-flex items-center justify-center rounded-xl px-2.5 py-1.5 text-xs font-semibold shadow-sm ${g.variants.docx && g.variants.docx.approvalStatus === 'approved' ? 'bg-blue-600 text-white hover:bg-blue-500 hover:shadow' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>DOCX</a>
                            <a href={g.variants.xlsx && g.variants.xlsx.approvalStatus === 'approved' ? `/api/admin/reports/${g.variants.xlsx._id}/download` : undefined} className={`cursor-pointer inline-flex items-center justify-center rounded-xl px-2.5 py-1.5 text-xs font-semibold shadow-sm ${g.variants.xlsx && g.variants.xlsx.approvalStatus === 'approved' ? 'bg-blue-600 text-white hover:bg-blue-500 hover:shadow' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>Excel</a>
                            <a href={g.variants.images && g.variants.images.approvalStatus === 'approved' ? `/api/admin/reports/${g.variants.images._id}/download` : undefined} className={`cursor-pointer inline-flex items-center justify-center rounded-xl px-2.5 py-1.5 text-xs font-semibold shadow-sm ${g.variants.images && g.variants.images.approvalStatus === 'approved' ? 'bg-blue-600 text-white hover:bg-blue-500 hover:shadow' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>Images</a>
                            <button onClick={() => openDelete(g.variants.pdf?._id || g.variants.docx?._id || g.variants.xlsx?._id || g.variants.images?._id || "")} className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-red-300 text-red-700 bg-white hover:bg-red-50 active:bg-red-100 shadow-sm hover:shadow transition-all">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cards on mobile */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {groups.map((g) => (
                  <div key={g.key} className="rounded-xl border border-rose-200 bg-white/90 backdrop-blur p-4 shadow-md">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-gray-900">{g.title}</div>
                        <div className="text-xs text-gray-600 mt-1"><span className="text-gray-500">Contract: </span>{g.contract_no || "-"}</div>
                      </div>
                      <span className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${g.reportType === "RealEstate" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : g.reportType === "Salvage" ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-sky-50 text-sky-800 border-sky-200"}`}>{g.reportType}</span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-gray-500">FMV</div>
                        <div className="font-medium text-gray-900">{formatFMV(g.fairMarketValue)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Created</div>
                        <div className="font-medium text-gray-900">{new Date(g.createdAt).toLocaleString()}</div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-gray-500">Created By</div>
                        <div className="font-medium text-gray-900">{g.userEmail || '-'}</div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <a href={g.variants.pdf && g.variants.pdf.approvalStatus === 'approved' ? `/api/admin/reports/${g.variants.pdf._id}/download` : undefined} className={`cursor-pointer inline-flex items-center justify-center rounded-xl px-3 py-1.5 text-xs font-semibold shadow-sm ${g.variants.pdf && g.variants.pdf.approvalStatus === 'approved' ? 'bg-blue-600 text-white hover:bg-blue-500 hover:shadow' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>PDF</a>
                      <a href={g.variants.docx && g.variants.docx.approvalStatus === 'approved' ? `/api/admin/reports/${g.variants.docx._id}/download` : undefined} className={`cursor-pointer inline-flex items-center justify-center rounded-xl px-3 py-1.5 text-xs font-semibold shadow-sm ${g.variants.docx && g.variants.docx.approvalStatus === 'approved' ? 'bg-blue-600 text-white hover:bg-blue-500 hover:shadow' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>DOCX</a>
                      <a href={g.variants.xlsx && g.variants.xlsx.approvalStatus === 'approved' ? `/api/admin/reports/${g.variants.xlsx._id}/download` : undefined} className={`cursor-pointer inline-flex items-center justify-center rounded-xl px-3 py-1.5 text-xs font-semibold shadow-sm ${g.variants.xlsx && g.variants.xlsx.approvalStatus === 'approved' ? 'bg-blue-600 text-white hover:bg-blue-500 hover:shadow' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>Excel</a>
                      <a href={g.variants.images && g.variants.images.approvalStatus === 'approved' ? `/api/admin/reports/${g.variants.images._id}/download` : undefined} className={`cursor-pointer inline-flex items-center justify-center rounded-xl px-3 py-1.5 text-xs font-semibold shadow-sm ${g.variants.images && g.variants.images.approvalStatus === 'approved' ? 'bg-blue-600 text-white hover:bg-blue-500 hover:shadow' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>Images</a>
                      <button onClick={() => openDelete(g.variants.pdf?._id || g.variants.docx?._id || g.variants.xlsx?._id || g.variants.images?._id || "")} className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-red-300 text-red-700 bg-white hover:bg-red-50 active:bg-red-100 shadow-sm hover:shadow transition-all">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {data ? (
                    <>
                      Showing {data.items?.length || 0} of {data.total} reports
                    </>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="cursor-pointer px-3 py-1.5 rounded-xl border border-rose-300 text-rose-700 bg-white hover:bg-rose-50 active:bg-rose-100 shadow-sm hover:shadow transition-all disabled:opacity-50"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    Prev
                  </button>
                  <span className="text-sm text-gray-700 tabular-nums">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    className="cursor-pointer px-3 py-1.5 rounded-xl border border-rose-300 text-rose-700 bg-white hover:bg-rose-50 active:bg-rose-100 shadow-sm hover:shadow transition-all disabled:opacity-50"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </main>
      <ConfirmModal
        open={confirmOpen}
        title="Delete this report?"
        description={
          <>
            This action cannot be undone. The report file (if present) and its
            record will be permanently removed.
          </>
        }
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => {
          setConfirmOpen(false);
          setPendingDeleteId(null);
        }}
        loading={deleting}
      />
    </div>
  );
}
