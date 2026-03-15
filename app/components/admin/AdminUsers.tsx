"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type Cell,
  type CellContext,
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  type Header,
  type HeaderGroup,
  type Row,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import ConfirmModal from "@/app/components/common/ConfirmModal";
import Modal from "@/app/components/common/Modal";

const CRM_QUADRANT_OPTIONS = ["NW", "NE", "SW", "SE", "NORTH", "SOUTH", "EAST", "WEST", "CENTRAL"] as const;
const CRM_SPECIALIZATION_OPTIONS = [
  { value: "industrial_construction", label: "Industrial & Construction" },
  { value: "farm_equipment_sales", label: "Farm & Farm Equipment Sales" },
  { value: "others", label: "Others" },
] as const;

type UserItem = {
  _id: string;
  email: string;
  username?: string;
  companyName?: string;
  contactEmail?: string;
  contactPhone?: string;
  companyAddress?: string;
  crmAddress?: string;
  crmQuadrant?: string;
  crmSpecializations?: string[];
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

const CRM_SPECIALIZATION_LABELS: Record<string, string> = {
  industrial_construction: "Industrial & Construction",
  farm_equipment_sales: "Farm & Farm Equipment Sales",
  others: "Others",
};

function formatCrmSpecializations(values?: string[]): string {
  if (!Array.isArray(values) || values.length === 0) return "-";
  return values
    .map((value) => CRM_SPECIALIZATION_LABELS[value] || value)
    .filter(Boolean)
    .join(", ");
}

function formatCreatedAt(value: string) {
  return new Date(value).toLocaleString();
}

function SortIndicator({ direction }: { direction: false | "asc" | "desc" }) {
  return (
    <span
      className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] transition-colors ${
        direction ? "bg-rose-100 text-rose-600" : "bg-gray-100 text-gray-400"
      }`}
      aria-hidden="true"
    >
      {direction === "asc" ? "↑" : direction === "desc" ? "↓" : "↕"}
    </span>
  );
}

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

  // CRM profile edit
  const [crmEditUser, setCrmEditUser] = useState<UserItem | null>(null);
  const [crmEditQuadrant, setCrmEditQuadrant] = useState("");
  const [crmEditSpecs, setCrmEditSpecs] = useState<string[]>([]);
  const [crmEditSaving, setCrmEditSaving] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<{ id: number; type: "success" | "error" | "info"; message: string }[]>([]);
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);

  function openCrmEdit(u: UserItem) {
    setCrmEditUser(u);
    setCrmEditQuadrant(u.crmQuadrant || "");
    setCrmEditSpecs(Array.isArray(u.crmSpecializations) ? [...u.crmSpecializations] : []);
  }

  async function saveCrmProfile() {
    if (!crmEditUser) return;
    try {
      setCrmEditSaving(true);
      const res = await fetch(`/api/admin/crm/users/${crmEditUser._id}/crm-profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crmQuadrant: crmEditQuadrant, crmSpecializations: crmEditSpecs }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.message || "Failed to update CRM profile");
      pushToast("CRM profile updated", "success");
      setCrmEditUser(null);
      await load();
    } catch (e: unknown) {
      pushToast(e instanceof Error ? e.message : "Failed to update CRM profile", "error");
    } finally {
      setCrmEditSaving(false);
    }
  }

  function toggleCrmEditSpec(value: string) {
    setCrmEditSpecs((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  }

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

  const items = data?.items || [];

  const columns: ColumnDef<UserItem>[] = [
    {
      id: "account",
      accessorFn: (row: UserItem) => row.email,
      header: "User",
      cell: ({ row }: CellContext<UserItem, unknown>) => {
        const u = row.original;
        return (
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="break-all font-semibold text-gray-900">{u.email}</span>
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                u.isBlocked
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}>
                {u.isBlocked ? "Blocked" : "Active"}
              </span>
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                u.isVerified
                  ? "border-sky-200 bg-sky-50 text-sky-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              }`}>
                {u.isVerified ? "Verified" : "Unverified"}
              </span>
            </div>
            <div className="mt-1 text-sm text-gray-600 break-words">{u.username || "No username set"}</div>
          </div>
        );
      },
    },
    {
      id: "company",
      accessorFn: (row: UserItem) => row.companyName || row.contactEmail || "",
      header: "Company / Contact",
      cell: ({ row }: CellContext<UserItem, unknown>) => {
        const u = row.original;
        return (
          <div className="min-w-0">
            <div className="font-medium text-gray-900 break-words">{u.companyName || "-"}</div>
            <div className="mt-1 text-sm text-gray-600 break-all">{u.contactEmail || "-"}</div>
            <div className="mt-1 text-xs text-gray-500 break-all">{u.contactPhone || "-"}</div>
          </div>
        );
      },
    },
    {
      id: "crm",
      accessorFn: (row: UserItem) => (row.isCrmAgent ? 1 : 0),
      header: "CRM",
      cell: ({ row }: CellContext<UserItem, unknown>) => {
        const u = row.original;
        return (
          <div className="min-w-0">
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
              u.isCrmAgent
                ? "border-sky-200 bg-sky-50 text-sky-700"
                : "border-gray-200 bg-gray-50 text-gray-600"
            }`}>
              {u.isCrmAgent ? "CRM Agent" : "Not Assigned"}
            </span>
            <div className="mt-2 text-xs leading-5 text-gray-600 break-words">
              {u.isCrmAgent
                ? [u.crmQuadrant ? `Quadrant ${u.crmQuadrant}` : "", formatCrmSpecializations(u.crmSpecializations)]
                    .filter((value) => value && value !== "-")
                    .join(" • ") || "-"
                : "No CRM assignment"}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }: CellContext<UserItem, unknown>) => (
        <div className="text-sm font-medium leading-5 text-gray-700">{formatCreatedAt(row.original.createdAt)}</div>
      ),
    },
    {
      id: "actions",
      enableSorting: false,
      header: "Actions",
      cell: ({ row }: CellContext<UserItem, unknown>) => {
        const u = row.original;
        return (
          <div className="flex flex-wrap justify-end gap-2">
            <button
              onClick={() => toggleCrmRole(u)}
              disabled={updatingCrmId === u._id || u.isBlocked}
              className="cursor-pointer inline-flex items-center justify-center gap-1 rounded-xl border border-sky-300 bg-white px-3 py-1.5 text-sky-700 shadow-sm hover:bg-sky-50 hover:shadow disabled:opacity-50"
            >
              {u.isCrmAgent ? "Remove CRM" : "Assign CRM"}
            </button>
            {u.isCrmAgent && (
              <button
                onClick={() => openCrmEdit(u)}
                className="cursor-pointer inline-flex items-center justify-center gap-1 rounded-xl border border-indigo-300 bg-white px-3 py-1.5 text-indigo-700 shadow-sm hover:bg-indigo-50 hover:shadow transition-all"
              >
                Edit CRM
              </button>
            )}
            <button
              onClick={() => toggleBlock(u)}
              className={`cursor-pointer inline-flex items-center justify-center gap-1 rounded-xl border bg-white px-3 py-1.5 shadow-sm hover:shadow transition-all ${
                u.isBlocked
                  ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100"
                  : "border-amber-300 text-amber-700 hover:bg-amber-50 active:bg-amber-100"
              }`}
            >
              {u.isBlocked ? "Unblock" : "Block"}
            </button>
            <button
              onClick={() => openDelete(u._id)}
              className="cursor-pointer inline-flex items-center justify-center gap-1 rounded-xl border border-red-300 bg-white px-3 py-1.5 text-red-700 shadow-sm hover:bg-red-50 hover:shadow"
            >
              Delete
            </button>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="admin-page-shell">
      <main className="max-w-6xl mx-auto space-y-6">
        <section className="admin-glass-surface rounded-3xl p-5 md:p-6">
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

        <section className="admin-glass-surface rounded-3xl p-4 md:p-6">
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

        <section className="admin-glass-surface rounded-3xl p-4 md:p-6">
          {loading ? (
            <div className="text-gray-500">Loading...</div>
          ) : error ? (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">{error}</div>
          ) : (
            <>
              <div className="hidden lg:block">
                <div className="overflow-hidden rounded-2xl border border-rose-100 bg-white/90 shadow-sm">
                  <table className="min-w-full table-fixed text-left text-sm">
                    <thead className="bg-rose-50/80">
                      {table.getHeaderGroups().map((headerGroup: HeaderGroup<UserItem>) => (
                        <tr key={headerGroup.id} className="border-b border-rose-100 text-xs uppercase tracking-[0.16em] text-gray-500">
                          {headerGroup.headers.map((header: Header<UserItem, unknown>) => {
                            const canSort = header.column.getCanSort();
                            const direction = header.column.getIsSorted();
                            const headerWidthClass = [
                              "w-[29%] pl-5",
                              "w-[24%]",
                              "w-[20%]",
                              "w-[12%]",
                              "w-[15%] pr-5",
                            ][header.index] || "";
                            return (
                              <th key={header.id} className={`px-4 py-3 font-semibold ${headerWidthClass}`}>
                                {header.isPlaceholder ? null : canSort ? (
                                  <button
                                    type="button"
                                    onClick={header.column.getToggleSortingHandler()}
                                    className="inline-flex items-center gap-2 text-left font-semibold text-gray-600 transition-colors hover:text-rose-600"
                                  >
                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                    <SortIndicator direction={direction} />
                                  </button>
                                ) : (
                                  <div className="text-left font-semibold text-gray-600">
                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                  </div>
                                )}
                              </th>
                            );
                          })}
                        </tr>
                      ))}
                    </thead>
                    <tbody>
                      {table.getRowModel().rows.length ? (
                        table.getRowModel().rows.map((row: Row<UserItem>) => (
                          <tr key={row.id} className="border-t border-rose-100/70 align-top transition-colors hover:bg-rose-50/40">
                            {row.getVisibleCells().map((cell: Cell<UserItem, unknown>) => (
                              <td key={cell.id} className="px-4 py-4 first:pl-5 last:pr-5">
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={columns.length} className="px-5 py-10 text-center text-sm text-gray-500">
                            No users found for the current filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:hidden">
                {items.map((u) => (
                  <div key={u._id} className="rounded-2xl border border-rose-200 bg-white/95 backdrop-blur p-4 shadow-md shadow-rose-100 sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-500">User account</div>
                        <div className="mt-1 break-all text-base font-semibold text-gray-900">{u.email}</div>
                        <div className="mt-1 text-sm text-gray-600 break-words">{u.username || "No username set"}</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                          u.isBlocked
                            ? "bg-rose-50 text-rose-800 border-rose-200"
                            : "bg-emerald-50 text-emerald-800 border-emerald-200"
                        }`}>
                          {u.isBlocked ? "Blocked" : "Active"}
                        </span>
                        <span className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                          u.isCrmAgent
                            ? "bg-sky-50 text-sky-800 border-sky-200"
                            : "bg-gray-50 text-gray-600 border-gray-200"
                        }`}>
                          {u.isCrmAgent ? "CRM Agent" : "Not Assigned"}
                        </span>
                        <span className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                          u.isVerified
                            ? "bg-sky-50 text-sky-800 border-sky-200"
                            : "bg-amber-50 text-amber-800 border-amber-200"
                        }`}>
                          {u.isVerified ? "Verified" : "Unverified"}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                      <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-3">
                        <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Company</div>
                        <div className="mt-1 font-medium text-gray-900 break-words">{u.companyName || "-"}</div>
                      </div>
                      <div className="rounded-xl border border-rose-100 bg-white p-3 shadow-sm">
                        <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Created</div>
                        <div className="mt-1 font-medium text-gray-900 text-sm leading-5">{formatCreatedAt(u.createdAt)}</div>
                      </div>
                      <div className="rounded-xl border border-rose-100 bg-white p-3 shadow-sm sm:col-span-2 lg:col-span-1">
                        <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Contact</div>
                        <div className="mt-1 font-medium text-gray-900 break-all">{u.contactEmail || "-"}</div>
                        <div className="mt-1 text-xs text-gray-500 break-all">{u.contactPhone || "-"}</div>
                      </div>
                      <div className="rounded-xl border border-rose-100 bg-white p-3 shadow-sm sm:col-span-2 lg:col-span-1">
                        <div className="text-xs font-medium uppercase tracking-wide text-gray-500">CRM details</div>
                        <div className="mt-1 font-medium text-gray-900">{u.isCrmAgent ? "Assigned" : "Not Assigned"}</div>
                        {u.isCrmAgent ? (
                          <div className="mt-1 text-xs leading-5 text-sky-700 break-words">
                            {[u.crmQuadrant ? `Quadrant ${u.crmQuadrant}` : "", formatCrmSpecializations(u.crmSpecializations)]
                              .filter((value) => value && value !== "-")
                              .join(" • ") || "-"}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-4">
                      <button
                        onClick={() => toggleCrmRole(u)}
                        disabled={updatingCrmId === u._id || u.isBlocked}
                        className="cursor-pointer inline-flex w-full items-center justify-center gap-1 px-3 py-2 rounded-xl border border-sky-300 text-sky-700 bg-white hover:bg-sky-50 active:bg-sky-100 shadow-sm hover:shadow transition-all disabled:opacity-50"
                      >
                        {u.isCrmAgent ? "Remove CRM" : "Assign CRM"}
                      </button>
                      {u.isCrmAgent && (
                        <button
                          onClick={() => openCrmEdit(u)}
                          className="cursor-pointer inline-flex w-full items-center justify-center gap-1 px-3 py-2 rounded-xl border border-indigo-300 text-indigo-700 bg-white hover:bg-indigo-50 active:bg-indigo-100 shadow-sm hover:shadow transition-all"
                        >
                          Edit CRM
                        </button>
                      )}
                      <button
                        onClick={() => toggleBlock(u)}
                        className={`cursor-pointer inline-flex w-full items-center justify-center gap-1 px-3 py-2 rounded-xl border bg-white shadow-sm hover:shadow transition-all ${
                          u.isBlocked
                            ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100"
                            : "border-amber-300 text-amber-700 hover:bg-amber-50 active:bg-amber-100"
                        }`}
                      >
                        {u.isBlocked ? "Unblock" : "Block"}
                      </button>
                      <button onClick={() => openDelete(u._id)} className="cursor-pointer inline-flex w-full items-center justify-center gap-1 px-3 py-2 rounded-xl border border-red-300 text-red-700 bg-white hover:bg-red-50 active:bg-red-100 shadow-sm hover:shadow transition-all">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-gray-600">
                  {data ? (
                    <>Showing {data.items?.length || 0} of {data.total} users</>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
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

      {/* CRM Profile Edit Modal */}
      <Modal
        open={!!crmEditUser}
        onClose={() => setCrmEditUser(null)}
        title={`Edit CRM Profile — ${crmEditUser?.email || ""}`}
        maxWidthClass="max-w-lg"
        footer={
          <>
            <button
              onClick={() => setCrmEditUser(null)}
              className="cursor-pointer px-4 py-2 rounded-xl bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 shadow-sm transition-all"
            >
              Cancel
            </button>
            <button
              onClick={saveCrmProfile}
              disabled={crmEditSaving}
              className="cursor-pointer px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-medium shadow-md transition-all disabled:opacity-50"
            >
              {crmEditSaving ? "Saving..." : "Save"}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">CRM Quadrant</label>
            <div className="flex flex-wrap gap-2">
              {CRM_QUADRANT_OPTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setCrmEditQuadrant(crmEditQuadrant === q ? "" : q)}
                  className={`cursor-pointer px-3 py-1.5 rounded-xl border text-sm font-medium transition-all ${
                    crmEditQuadrant === q
                      ? "border-rose-400 bg-rose-50 text-rose-700 shadow-sm"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
            {crmEditQuadrant && (
              <button
                type="button"
                onClick={() => setCrmEditQuadrant("")}
                className="cursor-pointer mt-2 text-xs text-rose-600 hover:underline"
              >
                Clear quadrant
              </button>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">CRM Specialization</label>
            <div className="flex flex-wrap gap-2">
              {CRM_SPECIALIZATION_OPTIONS.map((opt) => {
                const selected = crmEditSpecs.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleCrmEditSpec(opt.value)}
                    className={`cursor-pointer px-3 py-1.5 rounded-xl border text-sm font-medium transition-all ${
                      selected
                        ? "border-sky-400 bg-sky-50 text-sky-700 shadow-sm"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {crmEditSpecs.length > 0 && (
              <button
                type="button"
                onClick={() => setCrmEditSpecs([])}
                className="cursor-pointer mt-2 text-xs text-rose-600 hover:underline"
              >
                Clear all specializations
              </button>
            )}
          </div>
        </div>
      </Modal>

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
