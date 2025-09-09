"use client";

import { useEffect, useMemo, useState } from "react";
import {
  blockAdminAPI,
  createAdminAPI,
  deleteAdminAPI,
  listAdminsAPI,
} from "@/lib/api";
import Link from "next/link";
import Modal from "@/components/common/Modal";
import ConfirmModal from "@/components/common/ConfirmModal";

type AdminUser = {
  _id: string;
  email: string;
  username?: string;
  role: "admin" | "superadmin" | string;
  isBlocked?: boolean;
  companyName?: string;
  createdAt?: string;
};

export default function AdminManagement() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<
    { id: number; type: "success" | "error" | "info"; message: string }[]
  >([]);

  // Filters & sorting
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<"role" | "email" | "createdAt">("role");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmType, setConfirmType] = useState<"delete" | "block">("delete");
  const [targetUser, setTargetUser] = useState<AdminUser | null>(null);
  const [processing, setProcessing] = useState(false);

  function pushToast(
    message: string,
    type: "success" | "error" | "info" = "info"
  ) {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }

  async function load() {
    setError(null);
    setLoading(true);
    try {
      const data = await listAdminsAPI();
      setAdmins(data.admins || []);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to load admins";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await createAdminAPI({
        email,
        username: username || undefined,
        password: password || undefined,
        companyName: companyName || undefined,
      });
      setEmail("");
      setUsername("");
      setPassword("");
      setCompanyName("");
      await load();
      setCreateOpen(false);
      pushToast("Admin created successfully", "success");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to create admin";
      setError(message);
      pushToast(message, "error");
    } finally {
      setCreating(false);
    }
  }

  function openDelete(u: AdminUser) {
    if (u.role === "superadmin") return;
    setConfirmType("delete");
    setTargetUser(u);
    setConfirmOpen(true);
  }

  function openBlock(u: AdminUser) {
    if (u.role === "superadmin") return;
    setConfirmType("block");
    setTargetUser(u);
    setConfirmOpen(true);
  }

  async function confirmAction() {
    if (!targetUser) return;
    try {
      setProcessing(true);
      if (confirmType === "delete") {
        await deleteAdminAPI(targetUser._id);
        pushToast("Admin deleted", "success");
      } else {
        await blockAdminAPI(targetUser._id, !targetUser.isBlocked);
        pushToast(
          targetUser.isBlocked ? "Admin unblocked" : "Admin blocked",
          "success"
        );
      }
      setConfirmOpen(false);
      setTargetUser(null);
      await load();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Action failed";
      pushToast(message, "error");
    } finally {
      setProcessing(false);
    }
  }

  const filtered = useMemo(() => {
    let list = [...admins];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (u) =>
          (u.email || "").toLowerCase().includes(q) ||
          (u.username || "").toLowerCase().includes(q) ||
          (u.companyName || "").toLowerCase().includes(q)
      );
    }
    if (roleFilter) list = list.filter((u) => u.role === roleFilter);
    if (statusFilter) {
      list = list.filter((u) =>
        statusFilter === "blocked" ? !!u.isBlocked : !u.isBlocked
      );
    }
    return list;
  }, [admins, search, roleFilter, statusFilter]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortBy === "role") {
        // superadmin first
        const ra = a.role === "superadmin" ? 0 : a.role === "admin" ? 1 : 2;
        const rb = b.role === "superadmin" ? 0 : b.role === "admin" ? 1 : 2;
        return (
          (ra - rb) * dir || (a.email || "").localeCompare(b.email || "") * dir
        );
      }
      if (sortBy === "email") {
        return (a.email || "").localeCompare(b.email || "") * dir;
      }
      // createdAt
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return (da - db) * dir;
    });
    return list;
  }, [filtered, sortBy, sortDir]);

  function setSort(column: "role" | "email" | "createdAt") {
    if (sortBy === column) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-rose-50">
      <header className="sticky top-0 z-10 backdrop-blur bg-white/70 border-b border-rose-200/60">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-rose-500 shadow-md shadow-rose-200 ring-1 ring-rose-300 flex items-center justify-center text-white font-bold">
              CV
            </div>
            <div>
              <div className="text-sm text-gray-500">ClearValue</div>
              <div className="font-semibold text-gray-900">
                Admin Management
              </div>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-lg border border-rose-300 text-rose-700 bg-white hover:bg-rose-50 active:bg-rose-100 shadow-sm hover:shadow transition-all"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Hero Summary */}
        <section className="rounded-2xl border border-rose-200 bg-white/80 backdrop-blur shadow-xl shadow-rose-100 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
                Admin Management
              </h1>
              <p className="text-gray-600">
                Create, block, or remove admins. Only superadmins can perform
                these actions.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="rounded-xl border border-rose-200 bg-white/70 px-4 py-2 shadow-sm">
                <div className="text-xs text-gray-600">Total</div>
                <div className="text-lg font-semibold text-gray-900">
                  {admins.length}
                </div>
              </div>
              <div className="rounded-xl border border-rose-200 bg-white/70 px-4 py-2 shadow-sm">
                <div className="text-xs text-gray-600">Superadmins</div>
                <div className="text-lg font-semibold text-gray-900">
                  {admins.filter((a) => a.role === "superadmin").length}
                </div>
              </div>
              <div className="rounded-xl border border-rose-200 bg-white/70 px-4 py-2 shadow-sm hidden sm:block">
                <div className="text-xs text-gray-600">Blocked</div>
                <div className="text-lg font-semibold text-gray-900">
                  {admins.filter((a) => a.isBlocked).length}
                </div>
              </div>
            </div>
          </div>
        </section>
        {/* Create Admin modal trigger */}
        <section className="rounded-2xl border border-rose-200 bg-white/80 backdrop-blur shadow-lg shadow-rose-100 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Add Admin</h2>
            <button
              onClick={() => setCreateOpen(true)}
              className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-medium shadow-md hover:shadow-lg active:shadow-sm transition-all"
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
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Admin
            </button>
          </div>
          {error && (
            <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
              {error}
            </p>
          )}
        </section>

        {/* Filters for list */}
        <section className="rounded-2xl border border-rose-200 bg-white/80 backdrop-blur shadow-lg shadow-rose-100 p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Search
              </label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="email, username, or company"
                className="mt-1 w-full rounded-xl border border-gray-300 hover:border-gray-400 focus:border-rose-400 focus:ring-rose-400 shadow-sm px-3 py-2.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Role
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-300 hover:border-gray-400 focus:border-rose-400 focus:ring-rose-400 shadow-sm px-3 py-2.5"
              >
                <option value="">All</option>
                <option value="superadmin">Superadmin</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-300 hover:border-gray-400 focus:border-rose-400 focus:ring-rose-400 shadow-sm px-3 py-2.5"
              >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Sort
              </label>
              <div className="mt-1 flex gap-2">
                <button
                  onClick={() => setSort("role")}
                  className={`cursor-pointer px-3 py-1.5 rounded-xl border shadow-sm ${
                    sortBy === "role"
                      ? "border-rose-400 text-rose-700 bg-rose-50"
                      : "border-rose-200 text-gray-700 bg-white hover:bg-rose-50"
                  }`}
                >
                  Role{" "}
                  {sortBy === "role" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                </button>
                <button
                  onClick={() => setSort("email")}
                  className={`cursor-pointer px-3 py-1.5 rounded-xl border shadow-sm ${
                    sortBy === "email"
                      ? "border-rose-400 text-rose-700 bg-rose-50"
                      : "border-rose-200 text-gray-700 bg-white hover:bg-rose-50"
                  }`}
                >
                  Email{" "}
                  {sortBy === "email" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                </button>
                <button
                  onClick={() => setSort("createdAt")}
                  className={`cursor-pointer px-3 py-1.5 rounded-xl border shadow-sm ${
                    sortBy === "createdAt"
                      ? "border-rose-400 text-rose-700 bg-rose-50"
                      : "border-rose-200 text-gray-700 bg-white hover:bg-rose-50"
                  }`}
                >
                  Created{" "}
                  {sortBy === "createdAt"
                    ? sortDir === "asc"
                      ? "↑"
                      : "↓"
                    : ""}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* List Admins */}
        <section className="rounded-2xl border border-rose-200 bg-white/80 backdrop-blur shadow-lg shadow-rose-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Admins</h2>
          {loading ? (
            <div className="text-gray-500">Loading...</div>
          ) : (
            <>
              {/* Table on md+ */}
              <div className="overflow-x-auto hidden md:block">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="text-gray-600">
                      <th className="py-2 pr-4">Email</th>
                      <th className="py-2 pr-4">Username</th>
                      <th className="py-2 pr-4">Company</th>
                      <th className="py-2 pr-4">Role</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Created</th>
                      <th className="py-2 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((u) => (
                      <tr
                        key={u._id}
                        className="border-t border-rose-100/70 hover:bg-rose-50/40"
                      >
                        <td className="py-2 pr-4 text-gray-900">{u.email}</td>
                        <td className="py-2 pr-4 text-gray-700">
                          {u.username || "-"}
                        </td>
                        <td className="py-2 pr-4 text-gray-700">
                          {u.companyName || "-"}
                        </td>
                        <td className="py-2 pr-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                              u.role === "superadmin"
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-rose-50 text-rose-800 border-rose-200"
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-2 pr-4">
                          {u.isBlocked ? (
                            <span className="text-red-600">Blocked</span>
                          ) : (
                            <span className="text-emerald-700">Active</span>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-gray-700">
                          {u.createdAt
                            ? new Date(u.createdAt).toLocaleString()
                            : "-"}
                        </td>
                        <td className="py-2 pr-4 space-x-2">
                          <button
                            className="cursor-pointer px-3 py-1.5 rounded-xl border border-rose-300 text-rose-700 bg-white hover:bg-rose-50 active:bg-rose-100 shadow-sm hover:shadow transition-all disabled:opacity-50"
                            disabled={u.role === "superadmin"}
                            onClick={() => openBlock(u)}
                            title={
                              u.role === "superadmin"
                                ? "Superadmin cannot be blocked"
                                : u.isBlocked
                                ? "Unblock"
                                : "Block"
                            }
                          >
                            {u.isBlocked ? "Unblock" : "Block"}
                          </button>
                          <button
                            className="cursor-pointer px-3 py-1.5 rounded-xl border border-red-300 text-red-700 bg-white hover:bg-red-50 active:bg-red-100 shadow-sm hover:shadow transition-all disabled:opacity-50"
                            disabled={u.role === "superadmin"}
                            onClick={() => openDelete(u)}
                            title={
                              u.role === "superadmin"
                                ? "Superadmin cannot be deleted"
                                : "Delete admin"
                            }
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cards on mobile */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {sorted.map((u) => (
                  <div
                    key={u._id}
                    className="rounded-xl border border-rose-200 bg-white/90 backdrop-blur p-4 shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-gray-900">
                          {u.email}
                        </div>
                        <div className="text-sm text-gray-600">
                          {u.username || "-"}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          u.role === "superadmin"
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : "bg-rose-50 text-rose-800 border-rose-200"
                        }`}
                      >
                        {u.role}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-gray-500">Company</div>
                        <div className="font-medium text-gray-900">
                          {u.companyName || "-"}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Status</div>
                        <div
                          className={`font-medium ${
                            u.isBlocked ? "text-red-600" : "text-emerald-700"
                          }`}
                        >
                          {u.isBlocked ? "Blocked" : "Active"}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-gray-500">Created</div>
                        <div className="font-medium text-gray-900">
                          {u.createdAt
                            ? new Date(u.createdAt).toLocaleString()
                            : "-"}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        className="cursor-pointer px-3 py-1.5 rounded-xl border border-rose-300 text-rose-700 bg-white hover:bg-rose-50 active:bg-rose-100 shadow-sm hover:shadow transition-all disabled:opacity-50"
                        disabled={u.role === "superadmin"}
                        onClick={() => openBlock(u)}
                      >
                        {u.isBlocked ? "Unblock" : "Block"}
                      </button>
                      <button
                        className="cursor-pointer px-3 py-1.5 rounded-xl border border-red-300 text-red-700 bg-white hover:bg-red-50 active:bg-red-100 shadow-sm hover:shadow transition-all disabled:opacity-50"
                        disabled={u.role === "superadmin"}
                        onClick={() => openDelete(u)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </main>

      {/* Create Admin Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Admin"
        maxWidthClass="max-w-xl"
        footer={
          <>
            <button
              onClick={() => setCreateOpen(false)}
              className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 active:bg-gray-100 shadow-sm hover:shadow transition-all"
            >
              Cancel
            </button>
            <button
              form="create-admin-form"
              type="submit"
              disabled={creating}
              className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-medium shadow-md hover:shadow-lg active:shadow-sm transition-all"
            >
              {creating ? "Creating..." : "Create"}
            </button>
          </>
        }
      >
        <form
          id="create-admin-form"
          onSubmit={onCreate}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              type="email"
              className="mt-1 w-full rounded-xl border border-gray-300 hover:border-gray-400 focus:border-rose-400 focus:ring-rose-400 shadow-sm px-3 py-2.5"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Username (optional)
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              type="text"
              className="mt-1 w-full rounded-xl border border-gray-300 hover:border-gray-400 focus:border-rose-400 focus:ring-rose-400 shadow-sm px-3 py-2.5"
              placeholder="admin"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Temporary Password (optional)
            </label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="text"
              className="mt-1 w-full rounded-xl border border-gray-300 hover:border-gray-400 focus:border-rose-400 focus:ring-rose-400 shadow-sm px-3 py-2.5"
              placeholder="auto-generated if blank"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Company (optional)
            </label>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              type="text"
              className="mt-1 w-full rounded-xl border border-gray-300 hover:border-gray-400 focus:border-rose-400 focus:ring-rose-400 shadow-sm px-3 py-2.5"
              placeholder="Company"
            />
          </div>
        </form>
        {error && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
            {error}
          </p>
        )}
      </Modal>

      {/* Confirm Modal for block/delete */}
      <ConfirmModal
        open={confirmOpen}
        title={
          confirmType === "delete"
            ? "Delete this admin?"
            : targetUser?.isBlocked
            ? "Unblock this admin?"
            : "Block this admin?"
        }
        description={
          confirmType === "delete" ? (
            <>
              This action cannot be undone. The admin account will be
              permanently removed.
            </>
          ) : targetUser?.isBlocked ? (
            <>This will restore access for {targetUser?.email}.</>
          ) : (
            <>This will prevent {targetUser?.email} from signing in.</>
          )
        }
        confirmText={
          confirmType === "delete"
            ? "Delete"
            : targetUser?.isBlocked
            ? "Unblock"
            : "Block"
        }
        cancelText="Cancel"
        onConfirm={confirmAction}
        onCancel={() => {
          setConfirmOpen(false);
          setTargetUser(null);
        }}
        loading={processing}
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
