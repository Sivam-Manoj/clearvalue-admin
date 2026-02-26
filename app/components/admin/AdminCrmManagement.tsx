"use client";

import { useEffect, useMemo, useState } from "react";

type CrmUserItem = {
  _id: string;
  email: string;
  username?: string;
  companyName?: string;
  contactPhone?: string;
  isBlocked?: boolean;
  isCrmAgent: boolean;
  crmAssignedAt?: string;
  createdAt: string;
};

type UsersResponse = {
  items: CrmUserItem[];
  total: number;
  page: number;
  limit: number;
};

type CrmLeadItem = {
  _id: string;
  clientName: string;
  companyName?: string;
  email?: string;
  phoneFormatted?: string;
  status: string;
  priority: string;
  taskStartDate?: string;
  taskEndDate?: string;
  dueDate?: string;
  latestComment?: string;
  assignedTo?: { _id: string; email?: string; username?: string };
  assignedBy?: { _id: string; email?: string; username?: string };
  createdAt: string;
};

type LeadsResponse = {
  items: CrmLeadItem[];
  total: number;
  page: number;
  limit: number;
};

const CRM_STATUSES = [
  "pending",
  "in_progress",
  "completed",
  "no_answer",
  "not_interested",
] as const;

function toIsoDateValue(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export default function AdminCrmManagement() {
  const [toasts, setToasts] = useState<{ id: number; type: "success" | "error" | "info"; message: string }[]>([]);
  function pushToast(message: string, type: "success" | "error" | "info" = "info") {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }

  const [users, setUsers] = useState<UsersResponse | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userQ, setUserQ] = useState("");
  const [crmFilter, setCrmFilter] = useState<"all" | "crm" | "noncrm">("all");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const [leads, setLeads] = useState<LeadsResponse | null>(null);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [leadQ, setLeadQ] = useState("");
  const [leadStatus, setLeadStatus] = useState<string>("");

  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [taskStartDate, setTaskStartDate] = useState("");
  const [taskEndDate, setTaskEndDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [importing, setImporting] = useState(false);

  const userQuery = useMemo(() => {
    const p = new URLSearchParams();
    if (userQ.trim()) p.set("q", userQ.trim());
    if (crmFilter === "crm") p.set("isCrmAgent", "true");
    if (crmFilter === "noncrm") p.set("isCrmAgent", "false");
    p.set("page", "1");
    p.set("limit", "100");
    return p.toString();
  }, [crmFilter, userQ]);

  const leadQuery = useMemo(() => {
    const p = new URLSearchParams();
    if (leadQ.trim()) p.set("q", leadQ.trim());
    if (leadStatus) p.set("status", leadStatus);
    p.set("page", "1");
    p.set("limit", "100");
    return p.toString();
  }, [leadQ, leadStatus]);

  async function loadUsers() {
    setLoadingUsers(true);
    try {
      const res = await fetch(`/api/admin/crm/users?${userQuery}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to load CRM users");
      setUsers(json as UsersResponse);
    } catch (e: unknown) {
      pushToast(e instanceof Error ? e.message : "Failed to load CRM users", "error");
    } finally {
      setLoadingUsers(false);
    }
  }

  async function loadLeads() {
    setLoadingLeads(true);
    try {
      const res = await fetch(`/api/admin/crm/leads?${leadQuery}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to load CRM leads");
      setLeads(json as LeadsResponse);
    } catch (e: unknown) {
      pushToast(e instanceof Error ? e.message : "Failed to load CRM leads", "error");
    } finally {
      setLoadingLeads(false);
    }
  }

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userQuery]);

  useEffect(() => {
    loadLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadQuery]);

  async function toggleCrmAgent(user: CrmUserItem) {
    try {
      setUpdatingUserId(user._id);
      const res = await fetch(`/api/admin/crm/users/${user._id}/agent`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCrmAgent: !user.isCrmAgent }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to update CRM role");
      pushToast(!user.isCrmAgent ? "CRM role assigned" : "CRM role removed", "success");
      await Promise.all([loadUsers(), loadLeads()]);
    } catch (e: unknown) {
      pushToast(e instanceof Error ? e.message : "Failed to update CRM role", "error");
    } finally {
      setUpdatingUserId(null);
    }
  }

  function toggleSelectedUser(id: string, checked: boolean) {
    setSelectedUserIds((prev) => {
      if (checked) {
        if (prev.includes(id)) return prev;
        return [...prev, id];
      }
      return prev.filter((x) => x !== id);
    });
  }

  async function onImportLeads(e: React.FormEvent) {
    e.preventDefault();
    if (!excelFile) {
      pushToast("Please choose an Excel file first", "error");
      return;
    }

    try {
      setImporting(true);
      const formData = new FormData();
      formData.append("file", excelFile);
      if (selectedUserIds.length > 0) {
        formData.append("assignedToUserIds", JSON.stringify(selectedUserIds));
      }
      if (taskStartDate) formData.append("taskStartDate", taskStartDate);
      if (taskEndDate) formData.append("taskEndDate", taskEndDate);
      if (dueDate) formData.append("dueDate", dueDate);

      const res = await fetch(`/api/admin/crm/leads/import`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to import CRM leads");

      pushToast(`Imported ${json?.imported || 0} CRM leads`, "success");
      setExcelFile(null);
      setTaskStartDate("");
      setTaskEndDate("");
      setDueDate("");
      await loadLeads();
    } catch (e: unknown) {
      pushToast(e instanceof Error ? e.message : "Failed to import CRM leads", "error");
    } finally {
      setImporting(false);
    }
  }

  const crmUsersCount = users?.items?.filter((u) => u.isCrmAgent).length || 0;
  const totalUsersCount = users?.total || 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-rose-50">
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <section className="rounded-2xl border border-rose-200 bg-white/85 backdrop-blur shadow-xl shadow-rose-100 p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-gray-900">CRM Control Center</h1>
              <p className="text-gray-600">Assign CRM roles, import lead sheets, and monitor task activity.</p>
            </div>
            <div className="flex gap-3">
              <div className="rounded-xl border border-rose-200 bg-white px-4 py-2">
                <div className="text-xs text-gray-500">CRM Agents</div>
                <div className="text-lg font-semibold text-rose-700">{crmUsersCount}</div>
              </div>
              <div className="rounded-xl border border-rose-200 bg-white px-4 py-2">
                <div className="text-xs text-gray-500">Total Users</div>
                <div className="text-lg font-semibold text-gray-900">{totalUsersCount}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 rounded-2xl border border-rose-200 bg-white/90 p-4 md:p-5 shadow-lg">
            <div className="flex flex-col md:flex-row gap-3 md:items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700">Search users</label>
                <input
                  value={userQ}
                  onChange={(e) => setUserQ(e.target.value)}
                  placeholder="Email, username, company"
                  className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">CRM filter</label>
                <select
                  value={crmFilter}
                  onChange={(e) => setCrmFilter(e.target.value as "all" | "crm" | "noncrm")}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5"
                >
                  <option value="all">All users</option>
                  <option value="crm">CRM only</option>
                  <option value="noncrm">Non-CRM only</option>
                </select>
              </div>
            </div>

            <div className="mt-4 overflow-auto max-h-[420px] rounded-xl border border-rose-100">
              <table className="min-w-full text-sm">
                <thead className="bg-rose-50 text-gray-600">
                  <tr>
                    <th className="px-3 py-2 text-left">Assign</th>
                    <th className="px-3 py-2 text-left">User</th>
                    <th className="px-3 py-2 text-left">CRM Role</th>
                    <th className="px-3 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingUsers ? (
                    <tr><td className="px-3 py-3 text-gray-500" colSpan={4}>Loading users...</td></tr>
                  ) : (users?.items || []).length === 0 ? (
                    <tr><td className="px-3 py-3 text-gray-500" colSpan={4}>No users found</td></tr>
                  ) : (
                    (users?.items || []).map((u) => {
                      const selected = selectedUserIds.includes(u._id);
                      return (
                        <tr key={u._id} className="border-t border-rose-100">
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selected}
                              disabled={!u.isCrmAgent}
                              onChange={(e) => toggleSelectedUser(u._id, e.target.checked)}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <div className="font-medium text-gray-900">{u.email}</div>
                            <div className="text-xs text-gray-500">{u.username || "-"} {u.companyName ? `• ${u.companyName}` : ""}</div>
                          </td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 border text-xs font-medium ${u.isCrmAgent ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-50 text-gray-600 border-gray-200"}`}>
                              {u.isCrmAgent ? "CRM Agent" : "Not Assigned"}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <button
                              onClick={() => toggleCrmAgent(u)}
                              disabled={updatingUserId === u._id || Boolean(u.isBlocked)}
                              className="inline-flex items-center px-3 py-1.5 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                            >
                              {u.isCrmAgent ? "Remove CRM" : "Assign CRM"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-gray-500">Lead import assignment uses selected CRM agents. If none selected, leads distribute across all CRM agents.</p>
          </div>

          <div className="rounded-2xl border border-rose-200 bg-white/90 p-4 md:p-5 shadow-lg">
            <h2 className="text-lg font-semibold text-gray-900">Import Leads (Excel)</h2>
            <p className="text-sm text-gray-600 mt-1">Upload .xlsx/.xls/.csv. Phone numbers are normalized to Canada format.</p>

            <form onSubmit={onImportLeads} className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Excel file</label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Task start date (optional)</label>
                <input type="date" value={taskStartDate} onChange={(e) => setTaskStartDate(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Task end date (optional)</label>
                <input type="date" value={taskEndDate} onChange={(e) => setTaskEndDate(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Due date (optional)</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2" />
              </div>
              <button
                type="submit"
                disabled={importing}
                className="w-full inline-flex justify-center items-center px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-medium disabled:opacity-60"
              >
                {importing ? "Importing..." : "Import CRM Leads"}
              </button>
            </form>
          </div>
        </section>

        <section className="rounded-2xl border border-rose-200 bg-white/90 p-4 md:p-5 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-end gap-3 md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Lead Activity</h2>
              <p className="text-sm text-gray-600">Latest CRM tasks across all assigned agents.</p>
            </div>
            <div className="flex gap-2">
              <input
                value={leadQ}
                onChange={(e) => setLeadQ(e.target.value)}
                placeholder="Search lead, email, phone"
                className="rounded-xl border border-gray-300 px-3 py-2"
              />
              <select
                value={leadStatus}
                onChange={(e) => setLeadStatus(e.target.value)}
                className="rounded-xl border border-gray-300 px-3 py-2"
              >
                <option value="">All statuses</option>
                {CRM_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 overflow-auto max-h-[420px] rounded-xl border border-rose-100">
            <table className="min-w-full text-sm">
              <thead className="bg-rose-50 text-gray-600">
                <tr>
                  <th className="px-3 py-2 text-left">Lead</th>
                  <th className="px-3 py-2 text-left">Assigned To</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Window</th>
                  <th className="px-3 py-2 text-left">Latest Comment</th>
                </tr>
              </thead>
              <tbody>
                {loadingLeads ? (
                  <tr><td className="px-3 py-3 text-gray-500" colSpan={5}>Loading leads...</td></tr>
                ) : (leads?.items || []).length === 0 ? (
                  <tr><td className="px-3 py-3 text-gray-500" colSpan={5}>No CRM leads found</td></tr>
                ) : (
                  (leads?.items || []).map((lead) => (
                    <tr key={lead._id} className="border-t border-rose-100">
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-900">{lead.clientName}</div>
                        <div className="text-xs text-gray-500">{lead.email || "-"} {lead.phoneFormatted ? `• ${lead.phoneFormatted}` : ""}</div>
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {(lead.assignedTo?.username || lead.assignedTo?.email || "-") as string}
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex rounded-full px-2.5 py-0.5 border text-xs bg-sky-50 text-sky-700 border-sky-200">
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-700 text-xs">
                        <div>{toIsoDateValue(lead.taskStartDate) || "-"} → {toIsoDateValue(lead.taskEndDate) || "-"}</div>
                        <div>Due: {toIsoDateValue(lead.dueDate) || "-"}</div>
                      </td>
                      <td className="px-3 py-2 text-gray-700 max-w-[340px] truncate">{lead.latestComment || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <div className="fixed bottom-4 right-4 z-[90] space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-xl border px-4 py-3 shadow-md backdrop-blur ${
              t.type === "success"
                ? "bg-emerald-50/95 text-emerald-800 border-emerald-200"
                : t.type === "error"
                ? "bg-red-50/95 text-red-800 border-red-200"
                : "bg-sky-50/95 text-sky-800 border-sky-200"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
