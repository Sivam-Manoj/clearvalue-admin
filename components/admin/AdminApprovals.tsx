"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/common/Modal";
import ConfirmModal from "@/components/common/ConfirmModal";

type ReportItem = {
  _id: string;
  filename: string;
  address: string;
  fairMarketValue: string;
  reportType: "RealEstate" | "Salvage" | "Asset" | string;
  createdAt: string;
  user?: { email?: string; username?: string } | null;
  contract_no?: string;
  fileType?: "pdf" | "docx" | "xlsx" | "images";
  approvalStatus?: "pending" | "approved" | "rejected";
  report?: string;
};

type ApiResponse = { items: ReportItem[]; total: number; page: number; limit: number };

export default function AdminApprovals() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [toasts, setToasts] = useState<{ id: number; type: "success" | "error" | "info"; message: string }[]>([]);
  function pushToast(message: string, type: "success" | "error" | "info" = "info") {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }

  const totalPages = useMemo(() => (data ? Math.max(1, Math.ceil((data.total || 0) / (data.limit || limit))) : 1), [data, limit]);

  async function load(p = page) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reports/pending?page=${p}&limit=${limit}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to load pending reports");
      setData(json as ApiResponse);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to load pending reports";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    load(1);
  }, []);

  // Approve / Reject state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [mode, setMode] = useState<"approve" | "reject">("approve");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");

  async function doApprove() {
    if (!targetId) return;
    try {
      setProcessing(true);
      const res = await fetch(`/api/admin/reports/${targetId}/approve`, { method: "PATCH" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.message || "Failed to approve");
      pushToast("Report approved", "success");
      setConfirmOpen(false);
      setTargetId(null);
      await load();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Approve failed";
      pushToast(message, "error");
    } finally {
      setProcessing(false);
    }
  }

  async function doReject() {
    if (!targetId) return;
    try {
      setProcessing(true);
      const res = await fetch(`/api/admin/reports/${targetId}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: rejectNote }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.message || "Failed to reject");
      pushToast("Report rejected", "success");
      setRejectOpen(false);
      setRejectNote("");
      setTargetId(null);
      await load();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Reject failed";
      pushToast(message, "error");
    } finally {
      setProcessing(false);
    }
  }

  function formatFMV(value: string) {
    const numeric = Number(String(value).replace(/[^\d.-]/g, ""));
    if (!isNaN(numeric)) return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(numeric);
    return value;
  }

  type Group = {
    key: string;
    title: string;
    contract_no?: string;
    reportType: string;
    userEmail?: string;
    createdAt: string;
    fairMarketValue: string;
    variants: { pdf?: ReportItem; docx?: ReportItem; xlsx?: ReportItem; images?: ReportItem };
  };

  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Group>();
    const items = (data?.items || []) as ReportItem[];
    for (const r of items) {
      const key = String(((r as any).report as string | undefined) || r._id);
      let g = map.get(key);
      if (!g) {
        const base = r.reportType === 'RealEstate' ? 'Real Estate' : r.reportType === 'Salvage' ? 'Salvage' : 'Asset';
        const title = r.contract_no ? `${base} - ${r.contract_no}` : (r.address || base);
        g = {
          key,
          title,
          contract_no: r.contract_no,
          reportType: r.reportType,
          userEmail: r.user?.email || undefined,
          createdAt: r.createdAt,
          fairMarketValue: r.fairMarketValue,
          variants: {},
        };
        map.set(key, g);
      }
      if (new Date(r.createdAt).getTime() > new Date(g.createdAt).getTime()) g.createdAt = r.createdAt;
      const ft = ((r.fileType || r.filename.split('.').pop() || '') as string).toLowerCase();
      if (ft === 'pdf') g.variants.pdf = r;
      else if (ft === 'docx') g.variants.docx = r;
      else if (ft === 'xlsx') g.variants.xlsx = r;
      else if (ft === 'images' || ft === 'zip') g.variants.images = r;
    }
    return Array.from(map.values());
  }, [data]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-rose-50">
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <section className="rounded-2xl border border-rose-200 bg-white/80 backdrop-blur shadow-xl shadow-rose-100 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-gray-900">Report Approvals</h1>
              <p className="text-gray-600">Approve or reject newly created reports. Users will be notified by email.</p>
            </div>
            <div className="rounded-xl border border-rose-200 bg-white/70 px-4 py-2 shadow-sm">
              <div className="text-xs text-gray-600">Pending</div>
              <div className="text-lg font-semibold text-gray-900">{data?.total ?? 0}</div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-rose-200 bg-white/80 backdrop-blur shadow-lg shadow-rose-100 p-4 md:p-6">
          {loading ? (
            <div className="text-gray-500">Loading...</div>
          ) : error ? (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">{error}</div>
          ) : (
            <>
              <div className="overflow-x-auto hidden md:block">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="text-gray-600">
                      <th className="py-2 pr-4">Report</th>
                      <th className="py-2 pr-4">Contract</th>
                      <th className="py-2 pr-4">User</th>
                      <th className="py-2 pr-4">FMV</th>
                      <th className="py-2 pr-4">Created</th>
                      <th className="py-2 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((g) => (
                      <tr key={g.key} className="border-t border-rose-100/70 hover:bg-rose-50/40">
                        <td className="py-2 pr-4">
                          <div className="font-medium text-gray-900">{g.title}</div>
                        </td>
                        <td className="py-2 pr-4 text-gray-700">{g.contract_no || "-"}</td>
                        <td className="py-2 pr-4 text-gray-700">{g.userEmail || "-"}</td>
                        <td className="py-2 pr-4">{formatFMV(g.fairMarketValue)}</td>
                        <td className="py-2 pr-4 text-gray-700">{new Date(g.createdAt).toLocaleString()}</td>
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-2">
                            <a href={g.variants.pdf ? `/api/admin/reports/${g.variants.pdf._id}/download` : undefined} className={`cursor-pointer inline-flex items-center justify-center rounded-xl px-2.5 py-1.5 text-xs font-semibold shadow-sm ${g.variants.pdf ? 'bg-blue-600 text-white hover:bg-blue-500 hover:shadow' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>PDF</a>
                            <a href={g.variants.docx ? `/api/admin/reports/${g.variants.docx._id}/download` : undefined} className={`cursor-pointer inline-flex items-center justify-center rounded-xl px-2.5 py-1.5 text-xs font-semibold shadow-sm ${g.variants.docx ? 'bg-blue-600 text-white hover:bg-blue-500 hover:shadow' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>DOCX</a>
                            <a href={g.variants.xlsx ? `/api/admin/reports/${g.variants.xlsx._id}/download` : undefined} className={`cursor-pointer inline-flex items-center justify-center rounded-xl px-2.5 py-1.5 text-xs font-semibold shadow-sm ${g.variants.xlsx ? 'bg-blue-600 text-white hover:bg-blue-500 hover:shadow' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>Excel</a>
                            <a href={g.variants.images ? `/api/admin/reports/${g.variants.images._id}/download` : undefined} className={`cursor-pointer inline-flex items-center justify-center rounded-xl px-2.5 py-1.5 text-xs font-semibold shadow-sm ${g.variants.images ? 'bg-blue-600 text-white hover:bg-blue-500 hover:shadow' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>Images</a>
                            <button onClick={() => { setTargetId(g.variants.pdf?._id || g.variants.docx?._id || g.variants.xlsx?._id || g.variants.images?._id || null); setMode('approve'); setConfirmOpen(true); }} className="cursor-pointer px-3 py-1.5 rounded-xl border border-emerald-300 text-emerald-700 bg-white hover:bg-emerald-50 active:bg-emerald-100 shadow-sm hover:shadow transition-all">Approve</button>
                            <button onClick={() => { setTargetId(g.variants.pdf?._id || g.variants.docx?._id || g.variants.xlsx?._id || g.variants.images?._id || null); setRejectOpen(true); }} className="cursor-pointer px-3 py-1.5 rounded-xl border border-red-300 text-red-700 bg-white hover:bg-red-50 active:bg-red-100 shadow-sm hover:shadow transition-all">Reject</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {groups.map((g) => (
                  <div key={g.key} className="rounded-xl border border-rose-200 bg-white/90 backdrop-blur p-4 shadow-md">
                    <div className="font-semibold text-gray-900">{g.title}</div>
                    <div className="text-sm text-gray-600">{g.userEmail || "-"}</div>
                    <div className="text-xs text-gray-600 mt-1"><span className="text-gray-500">Contract: </span>{g.contract_no || "-"}</div>
                    <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-gray-500">FMV</div>
                        <div className="font-medium text-gray-900">{formatFMV(g.fairMarketValue)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Created</div>
                        <div className="font-medium text-gray-900">{new Date(g.createdAt).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <a href={g.variants.pdf ? `/api/admin/reports/${g.variants.pdf._id}/download` : undefined} className={`cursor-pointer inline-flex items-center justify-center rounded-xl px-3 py-1.5 text-xs font-semibold shadow-sm ${g.variants.pdf ? 'bg-blue-600 text-white hover:bg-blue-500 hover:shadow' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>PDF</a>
                      <a href={g.variants.docx ? `/api/admin/reports/${g.variants.docx._id}/download` : undefined} className={`cursor-pointer inline-flex items-center justify-center rounded-xl px-3 py-1.5 text-xs font-semibold shadow-sm ${g.variants.docx ? 'bg-blue-600 text-white hover:bg-blue-500 hover:shadow' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>DOCX</a>
                      <a href={g.variants.xlsx ? `/api/admin/reports/${g.variants.xlsx._id}/download` : undefined} className={`cursor-pointer inline-flex items-center justify-center rounded-xl px-3 py-1.5 text-xs font-semibold shadow-sm ${g.variants.xlsx ? 'bg-blue-600 text-white hover:bg-blue-500 hover:shadow' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>Excel</a>
                      <a href={g.variants.images ? `/api/admin/reports/${g.variants.images._id}/download` : undefined} className={`cursor-pointer inline-flex items-center justify-center rounded-xl px-3 py-1.5 text-xs font-semibold shadow-sm ${g.variants.images ? 'bg-blue-600 text-white hover:bg-blue-500 hover:shadow' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>Images</a>
                      <button onClick={() => { setTargetId(g.variants.pdf?._id || g.variants.docx?._id || g.variants.xlsx?._id || g.variants.images?._id || null); setMode('approve'); setConfirmOpen(true); }} className="cursor-pointer px-3 py-1.5 rounded-xl border border-emerald-300 text-emerald-700 bg-white hover:bg-emerald-50 active:bg-emerald-100 shadow-sm hover:shadow transition-all">Approve</button>
                      <button onClick={() => { setTargetId(g.variants.pdf?._id || g.variants.docx?._id || g.variants.xlsx?._id || g.variants.images?._id || null); setRejectOpen(true); }} className="cursor-pointer px-3 py-1.5 rounded-xl border border-red-300 text-red-700 bg-white hover:bg-red-50 active:bg-red-100 shadow-sm hover:shadow transition-all">Reject</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">{data ? <>Showing {data.items?.length || 0} of {data.total} pending</> : null}</div>
                <div className="flex items-center gap-2">
                  <button className="cursor-pointer px-3 py-1.5 rounded-xl border border-rose-300 text-rose-700 bg-white hover:bg-rose-50 active:bg-rose-100 shadow-sm hover:shadow transition-all disabled:opacity-50" onClick={() => { const p = Math.max(1, page - 1); setPage(p); load(p); }} disabled={page <= 1}>Prev</button>
                  <span className="text-sm text-gray-700 tabular-nums">Page {page} of {totalPages}</span>
                  <button className="cursor-pointer px-3 py-1.5 rounded-xl border border-rose-300 text-rose-700 bg-white hover:bg-rose-50 active:bg-rose-100 shadow-sm hover:shadow transition-all disabled:opacity-50" onClick={() => { const p = Math.min(totalPages, page + 1); setPage(p); load(p); }} disabled={page >= totalPages}>Next</button>
                </div>
              </div>
            </>
          )}
        </section>
      </main>

      {/* Approve Confirm */}
      <ConfirmModal
        open={confirmOpen && mode === "approve"}
        title="Approve this report?"
        description={<>The user will receive an approval email and be able to download the report.</>}
        confirmText="Approve"
        cancelText="Cancel"
        onConfirm={doApprove}
        onCancel={() => { setConfirmOpen(false); setTargetId(null); }}
        loading={processing}
      />

      {/* Reject with note */}
      <Modal
        open={rejectOpen}
        onClose={() => { if (!processing) { setRejectOpen(false); setRejectNote(""); setTargetId(null); } }}
        title="Reject this report"
        maxWidthClass="max-w-lg"
        footer={
          <>
            <button onClick={() => { if (!processing) { setRejectOpen(false); setRejectNote(""); setTargetId(null); } }} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 active:bg-gray-100 shadow-sm hover:shadow transition-all">Cancel</button>
            <button onClick={doReject} disabled={processing || !rejectNote.trim()} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-medium shadow-md hover:shadow-lg active:shadow-sm transition-all disabled:opacity-60">{processing ? "Rejecting..." : "Reject"}</button>
          </>
        }
      >
        <div>
          <label className="block text-sm font-medium text-gray-700">Reason</label>
          <textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} rows={5} className="mt-1 w-full rounded-xl border border-gray-300 hover:border-gray-400 focus:border-rose-400 focus:ring-rose-400 shadow-sm px-3 py-2.5" placeholder="Short note about why this report is rejected" />
          <p className="mt-2 text-xs text-gray-500">This note will be sent to the user.</p>
        </div>
      </Modal>

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-[90] space-y-2">
        {toasts.map((t) => (
          <div key={t.id} className={`rounded-xl border px-4 py-3 shadow-md backdrop-blur ${t.type === "success" ? "bg-emerald-50/90 text-emerald-800 border-emerald-200" : t.type === "error" ? "bg-red-50/90 text-red-800 border-red-200" : "bg-sky-50/90 text-sky-800 border-sky-200"}`}>
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
