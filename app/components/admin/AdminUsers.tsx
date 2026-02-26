"use client";

import { useEffect, useMemo, useState } from "react";
import ConfirmModal from "@/app/components/common/ConfirmModal";

type UserItem = {
  _id: string;
  email: string;
  username?: string;
  companyName?: string;
  contactEmail?: string;
  contactPhone?: string;
  companyAddress?: string;
  role: string;
  isBlocked: boolean;
  isVerified?: boolean;
  isCrmAgent?: boolean;
  crmAssignedAt?: string;
  createdAt: string;
};

type ApiResponse = {
  items: UserItem[];
  total: number;
  page: number;
  limit: number;
};

export default function AdminUsers() {
  // Filters
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>(""); // "" | "active" | "blocked"
  const [crmStatus, setCrmStatus] = useState<string>(""); // "" | "crm" | "noncrm"
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(20);

  // Data
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Delete confirm
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [updatingCrmId, setUpdatingCrmId] = useState<string | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<{ id: number; type: "success" | "error" | "info"; message: string }[]>([]);
  function pushToast(message: string, type: "success" | "error" | "info" = "info") {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }

  async function toggleCrmRole(u: UserItem) {
    try {
      setUpdatingCrmId(u._id);
      const res = await fetch(`/api/admin/crm/users/${u._id}/agent`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCrmAgent: !u.isCrmAgent }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.message || "Failed to update CRM role");
      pushToast(!u.isCrmAgent ? "CRM role assigned" : "CRM role removed", "success");
      await load();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to update CRM role";
      pushToast(message, "error");
    } finally {
      setUpdatingCrmId(null);
    }
  }

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (status === "active") p.set("isBlocked", "false");
    if (status === "blocked") p.set("isBlocked", "true");
    if (crmStatus === "crm") p.set("isCrmAgent", "true");
    if (crmStatus === "noncrm") p.set("isCrmAgent", "false");
    p.set("page", String(page));
    p.set("limit", String(limit));
    return p.toString();
  }, [q, status, crmStatus, page, limit]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users?${queryString}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to load users");
      setData(json as ApiResponse);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to load users";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  function onReset() {
    setQ("");
    setStatus("");
    setCrmStatus("");
    setPage(1);
  }

  function openDelete(id: string) {
    setPendingDeleteId(id);
    setConfirmOpen(true);
  }

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/admin/users/${pendingDeleteId}`, { method: "DELETE" });
      if (!(res.ok || res.status === 204)) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message || "Failed to delete user");
      }
      setConfirmOpen(false);
      setPendingDeleteId(null);
      pushToast("User deleted", "success");
      await load();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to delete user";
      pushToast(message, "error");
    } finally {
      setDeleting(false);
    }
  }

  async function toggleBlock(u: UserItem) {
    try {
      const res = await fetch(`/api/admin/users/${u._id}/block`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocked: !u.isBlocked }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.message || "Failed to update block status");
      pushToast(!u.isBlocked ? "User blocked" : "User unblocked", "success");
      await load();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to update block status";
      pushToast(message, "error");
    }
  }

  const totalPages = useMemo(() => {
    return data ? Math.max(1, Math.ceil((data.total || 0) / (data.limit || limit))) : 1;
  }, [data, limit]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-rose-50">
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Hero Summary */}
        <section className="rounded-2xl border border-rose-200 bg-white/80 backdrop-blur shadow-xl shadow-rose-100 p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-gray-900">Users</h1>
              <p className="text-gray-600">Search, filter, block/unblock and delete users.</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="rounded-xl border border-rose-200 bg-white/70 px-4 py-2 shadow-sm">
                <div className="text-xs text-gray-600">Results</div>
                <div className="text-lg font-semibold text-gray-900">{data?.total ?? 0}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="rounded-2xl border border-rose-200 bg-white/80 backdrop-blur shadow-lg shadow-rose-100 p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Search</label>
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Email, username, company"
                className="mt-1 w-full rounded-xl border border-gray-300 hover:border-gray-400 focus:border-rose-400 focus:ring-rose-400 shadow-sm px-3 py-2.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="mt-1 w-full rounded-xl border border-gray-300 hover:border-gray-400 focus:border-rose-400 focus:ring-rose-400 shadow-sm px-3 py-2.5"
              >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">CRM</label>
              <select
                value={crmStatus}
                onChange={(e) => {
                  setCrmStatus(e.target.value);
                  setPage(1);
                }}
                className="mt-1 w-full rounded-xl border border-gray-300 hover:border-gray-400 focus:border-rose-400 focus:ring-rose-400 shadow-sm px-3 py-2.5"
              >
                <option value="">All</option>
                <option value="crm">CRM Assigned</option>
                <option value="noncrm">Non-CRM</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button onClick={() => load()} className="cursor-pointer inline-flex items-center px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-medium shadow-md hover:shadow-lg active:shadow-sm transition-all">
              Apply
            </button>
            <button onClick={onReset} className="cursor-pointer inline-flex items-center px-4 py-2 rounded-xl border border-rose-300 text-rose-700 bg-white hover:bg-rose-50 active:bg-rose-100 shadow-sm hover:shadow transition-all">
              Reset
            </button>
          </div>
        </section>

        {/* List */}
        <section className="rounded-2xl border border-rose-200 bg-white/80 backdrop-blur shadow-lg shadow-rose-100 p-4 md:p-6">
          {loading ? (
            <div className="text-gray-500">Loading...</div>
          ) : error ? (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">{error}</div>
          ) : (
            <>
              {/* Table */}
              <div className="overflow-x-auto hidden md:block">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="text-gray-600">
                      <th className="py-2 pr-4">Email</th>
                      <th className="py-2 pr-4">Username</th>
                      <th className="py-2 pr-4">Company</th>
                      <th className="py-2 pr-4">Contact</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">CRM</th>
                      <th className="py-2 pr-4">Created</th>
                      <th className="py-2 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.items || []).map((u) => (
                      <tr key={u._id} className="border-t border-rose-100/70 hover:bg-rose-50/40">
                        <td className="py-2 pr-4 text-gray-900">{u.email}</td>
                        <td className="py-2 pr-4 text-gray-700">{u.username || "-"}</td>
                        <td className="py-2 pr-4 text-gray-700">{u.companyName || "-"}</td>
                        <td className="py-2 pr-4 text-gray-700">
                          <div className="flex flex-col">
                            <span>{u.contactEmail || "-"}</span>
                            <span className="text-xs text-gray-500">{u.contactPhone || "-"}</span>
                          </div>
                        </td>
                        <td className="py-2 pr-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            u.isBlocked
                              ? "bg-rose-50 text-rose-800 border-rose-200"
                              : "bg-emerald-50 text-emerald-800 border-emerald-200"
                          }`}>
                            {u.isBlocked ? "Blocked" : "Active"}
                          </span>
                        </td>
                        <td className="py-2 pr-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            u.isCrmAgent
                              ? "bg-sky-50 text-sky-800 border-sky-200"
                              : "bg-gray-50 text-gray-600 border-gray-200"
                          }`}>
                            {u.isCrmAgent ? "CRM Agent" : "Not Assigned"}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-gray-700">{new Date(u.createdAt).toLocaleString()}</td>
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleCrmRole(u)}
                              disabled={updatingCrmId === u._id || u.isBlocked}
                              className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-sky-300 text-sky-700 bg-white hover:bg-sky-50 active:bg-sky-100 shadow-sm hover:shadow transition-all disabled:opacity-50"
                            >
                              {u.isCrmAgent ? "Remove CRM" : "Assign CRM"}
                            </button>
                            <button
                              onClick={() => toggleBlock(u)}
                              className={`cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border bg-white shadow-sm hover:shadow transition-all ${
                                u.isBlocked
                                  ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100"
                                  : "border-amber-300 text-amber-700 hover:bg-amber-50 active:bg-amber-100"
                              }`}
                            >
                              {u.isBlocked ? "Unblock" : "Block"}
                            </button>
                            <button
                              onClick={() => openDelete(u._id)}
                              className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-red-300 text-red-700 bg-white hover:bg-red-50 active:bg-red-100 shadow-sm hover:shadow transition-all"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {(data?.items || []).map((u) => (
                  <div key={u._id} className="rounded-xl border border-rose-200 bg-white/90 backdrop-blur p-4 shadow-md">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-gray-900">{u.email}</div>
                        <div className="text-sm text-gray-600">{u.username || "-"}</div>
                      </div>
                      <span className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        u.isBlocked
                          ? "bg-rose-50 text-rose-800 border-rose-200"
                          : "bg-emerald-50 text-emerald-800 border-emerald-200"
                      }`}>
                        {u.isBlocked ? "Blocked" : "Active"}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-gray-500">Company</div>
                        <div className="font-medium text-gray-900">{u.companyName || "-"}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Created</div>
                        <div className="font-medium text-gray-900">{new Date(u.createdAt).toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">CRM</div>
                        <div className="font-medium text-gray-900">{u.isCrmAgent ? "CRM Agent" : "Not Assigned"}</div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-gray-500">Contact</div>
                        <div className="font-medium text-gray-900">
                          {u.contactEmail || "-"}
                          {u.contactPhone ? <span className="text-xs text-gray-500 ml-2">{u.contactPhone}</span> : null}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => toggleCrmRole(u)}
                        disabled={updatingCrmId === u._id || u.isBlocked}
                        className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-sky-300 text-sky-700 bg-white hover:bg-sky-50 active:bg-sky-100 shadow-sm hover:shadow transition-all disabled:opacity-50"
                      >
                        {u.isCrmAgent ? "Remove CRM" : "Assign CRM"}
                      </button>
                      <button
                        onClick={() => toggleBlock(u)}
                        className={`cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border bg-white shadow-sm hover:shadow transition-all ${
                          u.isBlocked
                            ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100"
                            : "border-amber-300 text-amber-700 hover:bg-amber-50 active:bg-amber-100"
                        }`}
                      >
                        {u.isBlocked ? "Unblock" : "Block"}
                      </button>
                      <button onClick={() => openDelete(u._id)} className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-red-300 text-red-700 bg-white hover:bg-red-50 active:bg-red-100 shadow-sm hover:shadow transition-all">
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
                    <>Showing {data.items?.length || 0} of {data.total} users</>
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

      {/* Delete Confirm */}
      <ConfirmModal
        open={confirmOpen}
        title="Delete this user?"
        description={<>This action cannot be undone. This will permanently remove the user&apos;s account and data.</>}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => {
          setConfirmOpen(false);
          setPendingDeleteId(null);
        }}
        loading={deleting}
      />

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-[90] space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-xl border px-4 py-3 shadow-md backdrop-blur ${
              t.type === "success"
                ? "bg-emerald-50/90 text-emerald-800 border-emerald-200"
                : t.type === "error"
                ? "bg-red-50/90 text-red-800 border-red-200"
                : "bg-sky-50/90 text-sky-800 border-sky-200"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
