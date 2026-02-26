"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

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
  phoneRaw?: string;
  phoneFormatted?: string;
  contactSocials?: string;
  companyLocation?: string;
  industry?: string;
  website?: string;
  listItems?: string[];
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

type CrmImportFileItem = {
  sourceBatchId: string;
  sourceFileName?: string;
  sourceFileUrl?: string;
  sourceFileKey?: string;
  importedAt: string;
  latestLeadAt: string;
  leadCount: number;
};

type ImportFilesResponse = {
  items: CrmImportFileItem[];
  total: number;
  page: number;
  limit: number;
};

type ExcelRow = Record<string, unknown>;

type PreviewLeadRow = {
  rowNumber: number;
  title: string;
  clientName: string;
  companyName: string;
  email: string;
  phone: string;
  socials: string;
  lists: string[];
  location: string;
  industry: string;
  website: string;
  notes: string;
  duplicateKey: string;
};

type DuplicateIssue = {
  rowNumber: number;
  duplicateKey: string;
  reason: string;
};

const CRM_STATUSES = [
  "pending",
  "in_progress",
  "completed",
  "no_answer",
  "not_interested",
] as const;

const IMPORT_COLUMN_HELPER = [
  { field: "Client Name", headers: "Client Name, Contact Name, Name, Customer" },
  { field: "Title", headers: "Title, Task, Task Title, Designation, Role" },
  { field: "Company", headers: "Company, Company Name, Business, Organization" },
  { field: "Email", headers: "Email, Emails, Email Address, Mail, E-mail" },
  { field: "Phone", headers: "Phone, Phones, Mobile, Contact Number, Telephone" },
  { field: "Lists", headers: "Lists, List, List Name, Lead List, Segment, Tags" },
  { field: "Socials", headers: "Contact Socials, Social, Social Links" },
  { field: "Location", headers: "Company Location, Location, City, Address" },
  { field: "Industry", headers: "Industry, Sector" },
  { field: "Website", headers: "Website, Site, URL, Web" },
  { field: "Notes", headers: "Notes, Note, Comments, Remarks, Description" },
] as const;

function toIsoDateValue(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function toText(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function extractPrimaryEmail(value: unknown): string {
  const text = toText(value).toLowerCase();
  if (!text) return "";

  const matched = text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  if (matched?.[0]) return matched[0].toLowerCase();

  const firstToken = text
    .split(/[\s,;|/]+/g)
    .map((x) => x.trim())
    .find(Boolean);
  return (firstToken || "").toLowerCase();
}

function extractPrimaryPhone(value: unknown): string {
  const text = toText(value);
  if (!text) return "";
  const firstToken = text
    .split(/[\n,;|/]+/g)
    .map((x) => x.trim())
    .find(Boolean);
  return firstToken || text;
}

function deriveClientName(input: {
  providedClientName: string;
  title: string;
  companyName: string;
  email: string;
}): string {
  if (input.providedClientName) return input.providedClientName;
  if (input.title && input.companyName) return `${input.title} - ${input.companyName}`;
  if (input.companyName) return input.companyName;

  const emailLocal = input.email.split("@")[0]?.replace(/[._-]+/g, " ").trim() || "";
  if (emailLocal) return emailLocal;
  if (input.title) return input.title;

  return "Unknown Client";
}

function toLookup(row: ExcelRow): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row || {})) {
    out[key.trim().toLowerCase()] = value;
  }
  return out;
}

function pickField(rowLookup: Record<string, unknown>, candidates: string[]): unknown {
  for (const key of candidates) {
    const value = rowLookup[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return undefined;
}

function splitListValues(value: unknown): { values: string[]; hasInlineDuplicates: boolean } {
  const text = toText(value);
  if (!text) return { values: [], hasInlineDuplicates: false };

  const rawParts = text
    .split(/[\n,;|]/g)
    .map((x) => x.trim())
    .filter(Boolean);

  const deduped: string[] = [];
  const seen = new Set<string>();
  let hasInlineDuplicates = false;

  for (const item of rawParts) {
    const key = item.toLowerCase();
    if (seen.has(key)) {
      hasInlineDuplicates = true;
      continue;
    }
    seen.add(key);
    deduped.push(item);
  }

  return { values: deduped, hasInlineDuplicates };
}

function normalizePhoneForKey(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits;
}

function statusLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (x) => x.toUpperCase());
}

function buildPreviewRows(rows: ExcelRow[]): {
  parsedRows: PreviewLeadRow[];
  duplicateIssues: DuplicateIssue[];
} {
  const parsedRows: PreviewLeadRow[] = [];
  const duplicateIssues: DuplicateIssue[] = [];
  const firstSeenByListIdentity = new Map<string, number>();

  rows.forEach((rawRow, idx) => {
    const rowNumber = idx + 2;
    const row = toLookup(rawRow);

    const providedTitle = toText(
      pickField(row, ["title", "task", "task title", "designation", "role"])
    );
    const title = providedTitle || "CRM Follow-up";
    const companyName = toText(
      pickField(row, ["company", "company name", "business", "organization"])
    );
    const providedClientName = toText(
      pickField(row, [
        "client name",
        "client_name",
        "client",
        "customer",
        "customer name",
        "name",
        "contact",
        "contact person",
        "contact name",
        "full name",
        "person name",
      ])
    );
    const email = extractPrimaryEmail(
      pickField(row, ["email", "emails", "email address", "mail", "e-mail"])
    );
    const phone = extractPrimaryPhone(
      pickField(row, ["phone", "phones", "phone number", "number", "mobile", "contact number", "telephone"])
    );
    const clientName = deriveClientName({
      providedClientName,
      title: providedTitle,
      companyName,
      email,
    });
    const socials = toText(
      pickField(row, ["contact socials", "social", "socials", "social links"])
    );
    const location = toText(
      pickField(row, ["company location", "location", "city", "address"])
    );
    const industry = toText(pickField(row, ["industry", "sector"]));
    const website = toText(pickField(row, ["website", "site", "url", "web"]));
    const notes = toText(
      pickField(row, ["notes", "note", "comments", "comment", "remarks", "description"])
    );

    const listInfo = splitListValues(
      pickField(row, ["lists", "list", "list name", "lead list", "segment", "tags"])
    );

    const identity =
      email ||
      normalizePhoneForKey(phone) ||
      `${clientName.toLowerCase()}|${companyName.toLowerCase()}`;

    const listKeyForRow =
      listInfo.values.length > 0
        ? [...listInfo.values].map((x) => x.toLowerCase()).sort().join("|")
        : "no-list";
    const duplicateKey = `${identity}::${listKeyForRow}`;

    if (listInfo.hasInlineDuplicates) {
      duplicateIssues.push({
        rowNumber,
        duplicateKey,
        reason: "Duplicate list items inside the Lists cell",
      });
    }

    for (const listItem of listInfo.values) {
      const listItemKey = listItem.toLowerCase();
      const listIdentityKey = `${identity}::${listItemKey}`;
      const firstSeen = firstSeenByListIdentity.get(listIdentityKey);
      if (typeof firstSeen === "number") {
        duplicateIssues.push({
          rowNumber,
          duplicateKey: listIdentityKey,
          reason: `List item "${listItem}" already assigned to this lead on row ${firstSeen}`,
        });
      } else {
        firstSeenByListIdentity.set(listIdentityKey, rowNumber);
      }
    }

    parsedRows.push({
      rowNumber,
      title,
      clientName,
      companyName,
      email,
      phone,
      socials,
      lists: listInfo.values,
      location,
      industry,
      website,
      notes,
      duplicateKey,
    });
  });

  return { parsedRows, duplicateIssues };
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

  const [importFiles, setImportFiles] = useState<ImportFilesResponse | null>(null);
  const [loadingImportFiles, setLoadingImportFiles] = useState(false);
  const [deletingBatchId, setDeletingBatchId] = useState<string | null>(null);

  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [taskStartDate, setTaskStartDate] = useState("");
  const [taskEndDate, setTaskEndDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [importing, setImporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [parsingPreview, setParsingPreview] = useState(false);
  const [previewRows, setPreviewRows] = useState<PreviewLeadRow[]>([]);
  const [duplicateIssues, setDuplicateIssues] = useState<DuplicateIssue[]>([]);
  const [previewParseError, setPreviewParseError] = useState<string>("");
  const [previewSheetName, setPreviewSheetName] = useState("");

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

  async function loadImportFiles() {
    setLoadingImportFiles(true);
    try {
      const res = await fetch(`/api/admin/crm/import-files?page=1&limit=100`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to load imported Excel files");
      setImportFiles(json as ImportFilesResponse);
    } catch (e: unknown) {
      pushToast(e instanceof Error ? e.message : "Failed to load imported Excel files", "error");
    } finally {
      setLoadingImportFiles(false);
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

  useEffect(() => {
    loadImportFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  async function handleExcelFileChange(file: File | null) {
    setExcelFile(file);
    setPreviewRows([]);
    setDuplicateIssues([]);
    setPreviewParseError("");
    setPreviewSheetName("");

    if (!file) return;

    try {
      setParsingPreview(true);
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const firstSheet = workbook.SheetNames[0];
      if (!firstSheet) throw new Error("Excel file has no sheets");

      const worksheet = workbook.Sheets[firstSheet];
      const rows = XLSX.utils.sheet_to_json<ExcelRow>(worksheet, { defval: "" });
      if (!rows.length) throw new Error("Excel file has no data rows");

      const built = buildPreviewRows(rows);
      setPreviewRows(built.parsedRows);
      setDuplicateIssues(built.duplicateIssues);
      setPreviewSheetName(firstSheet);
    } catch (e: unknown) {
      setPreviewParseError(e instanceof Error ? e.message : "Failed to parse Excel file");
    } finally {
      setParsingPreview(false);
    }
  }

  async function onImportLeads() {
    if (!excelFile) {
      pushToast("Please choose an Excel file first", "error");
      return;
    }

    if (duplicateIssues.length > 0) {
      pushToast("Duplicate list items found. Please fix before importing.", "error");
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
      setPreviewRows([]);
      setDuplicateIssues([]);
      setPreviewParseError("");
      setPreviewSheetName("");
      setTaskStartDate("");
      setTaskEndDate("");
      setDueDate("");
      setShowImportModal(false);
      await Promise.all([loadLeads(), loadImportFiles()]);
    } catch (e: unknown) {
      pushToast(e instanceof Error ? e.message : "Failed to import CRM leads", "error");
    } finally {
      setImporting(false);
    }
  }

  async function deleteImportedFile(item: CrmImportFileItem) {
    const label = item.sourceFileName || "this uploaded Excel file";
    const ok = window.confirm(
      `Delete ${label}? This will also permanently delete ${item.leadCount} CRM leads imported from it.`
    );
    if (!ok) return;

    try {
      setDeletingBatchId(item.sourceBatchId);
      const res = await fetch(`/api/admin/crm/import-files/${item.sourceBatchId}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to delete imported file");

      pushToast(`Deleted file batch and ${json?.deletedLeads || item.leadCount} associated leads`, "success");
      await Promise.all([loadLeads(), loadImportFiles()]);
    } catch (e: unknown) {
      pushToast(e instanceof Error ? e.message : "Failed to delete imported file", "error");
    } finally {
      setDeletingBatchId(null);
    }
  }

  const crmUsersCount = users?.items?.filter((u) => u.isCrmAgent).length || 0;
  const totalUsersCount = users?.total || 0;
  const duplicateIssuesByRow = useMemo(() => {
    const map = new Map<number, string[]>();
    duplicateIssues.forEach((issue) => {
      const existing = map.get(issue.rowNumber) || [];
      existing.push(issue.reason);
      map.set(issue.rowNumber, existing);
    });
    return map;
  }, [duplicateIssues]);
  const rowCountWithDuplicates = duplicateIssuesByRow.size;
  const readyPreviewRows = Math.max(0, previewRows.length - rowCountWithDuplicates);
  const selectedAssignees = useMemo(
    () => (users?.items || []).filter((u) => selectedUserIds.includes(u._id)),
    [selectedUserIds, users?.items]
  );

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
            <p className="text-sm text-gray-600 mt-1">
              Open upload modal, preview extracted rows, and block duplicate list entries before import.
            </p>

            <div className="mt-4 space-y-3">
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

              <div className="rounded-xl border border-rose-100 bg-rose-50/60 px-3 py-2.5">
                <div className="text-xs text-gray-600">Selected assignees</div>
                <div className="mt-1 text-sm font-medium text-gray-900">
                  {selectedUserIds.length > 0
                    ? `${selectedUserIds.length} CRM agent${selectedUserIds.length > 1 ? "s" : ""}`
                    : "Auto-distribute among all active CRM agents"}
                </div>
              </div>

              {excelFile ? (
                <div className="rounded-xl border border-sky-100 bg-sky-50/70 px-3 py-2.5">
                  <div className="text-xs text-sky-700">Last selected file</div>
                  <div className="text-sm font-medium text-sky-900 truncate">{excelFile.name}</div>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                className="w-full inline-flex justify-center items-center px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-medium"
              >
                Open Upload Preview Modal
              </button>
            </div>
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
                  <option key={s} value={s}>{statusLabel(s)}</option>
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
                        <div className="text-xs text-gray-500">
                          {lead.email || "-"} {lead.phoneFormatted || lead.phoneRaw ? `• ${lead.phoneFormatted || lead.phoneRaw}` : ""}
                        </div>
                        {lead.companyLocation || lead.industry || lead.website ? (
                          <div className="text-xs text-gray-500">
                            {[lead.companyLocation, lead.industry].filter(Boolean).join(" • ") || lead.website}
                          </div>
                        ) : null}
                        {lead.listItems?.length ? (
                          <div className="text-xs text-gray-500 truncate">Lists: {lead.listItems.join(", ")}</div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {(lead.assignedTo?.username || lead.assignedTo?.email || "-") as string}
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex rounded-full px-2.5 py-0.5 border text-xs bg-sky-50 text-sky-700 border-sky-200">
                          {statusLabel(lead.status)}
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

        <section className="rounded-2xl border border-rose-200 bg-white/90 p-4 md:p-5 shadow-lg">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Uploaded Excel Files</h2>
              <p className="text-sm text-gray-600">
                Delete a file to remove every CRM lead imported from that upload batch.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadImportFiles()}
              disabled={loadingImportFiles || deletingBatchId !== null}
              className="inline-flex items-center justify-center rounded-xl border border-sky-200 px-3 py-2 text-sm text-sky-700 hover:bg-sky-50 disabled:opacity-60"
            >
              Refresh Files
            </button>
          </div>

          <div className="mt-4 overflow-auto max-h-[360px] rounded-xl border border-rose-100">
            <table className="min-w-full text-sm">
              <thead className="bg-rose-50 text-gray-600">
                <tr>
                  <th className="px-3 py-2 text-left">File</th>
                  <th className="px-3 py-2 text-left">Imported</th>
                  <th className="px-3 py-2 text-left">Leads</th>
                  <th className="px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingImportFiles ? (
                  <tr><td className="px-3 py-3 text-gray-500" colSpan={4}>Loading imported files...</td></tr>
                ) : (importFiles?.items || []).length === 0 ? (
                  <tr><td className="px-3 py-3 text-gray-500" colSpan={4}>No imported Excel files found</td></tr>
                ) : (
                  (importFiles?.items || []).map((item) => (
                    <tr key={item.sourceBatchId} className="border-t border-rose-100">
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-900 truncate max-w-[340px]">
                          {item.sourceFileName || "Unnamed import file"}
                        </div>
                        <div className="text-xs text-gray-500">Batch: {item.sourceBatchId}</div>
                        {item.sourceFileUrl ? (
                          <a
                            href={item.sourceFileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-sky-700 hover:underline"
                          >
                            View in R2
                          </a>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-700">
                        <div>{toIsoDateValue(item.importedAt) || "-"}</div>
                        <div>Latest lead: {toIsoDateValue(item.latestLeadAt) || "-"}</div>
                      </td>
                      <td className="px-3 py-2 text-gray-800 font-medium">{item.leadCount}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => void deleteImportedFile(item)}
                          disabled={deletingBatchId === item.sourceBatchId}
                          className="inline-flex items-center rounded-xl border border-red-300 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50 disabled:opacity-60"
                        >
                          {deletingBatchId === item.sourceBatchId ? "Deleting..." : "Delete File + Leads"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {showImportModal ? (
          <div className="fixed inset-0 z-[95] p-3 md:p-6 lg:p-10">
            <div
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]"
              onClick={() => !importing && setShowImportModal(false)}
            />

            <div className="relative mx-auto flex h-[92vh] max-w-7xl flex-col overflow-hidden rounded-3xl border border-rose-200 bg-gradient-to-br from-white via-rose-50/40 to-sky-50 shadow-2xl">
              <div className="flex items-center justify-between border-b border-rose-100 px-5 py-4 md:px-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">CRM Excel Upload Preview</h3>
                  <p className="text-sm text-gray-600">
                    Extracted rows are shown below. Duplicate list items are blocked before upload.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={importing}
                  onClick={() => setShowImportModal(false)}
                  className="rounded-xl border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  Close
                </button>
              </div>

              <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)]">
                <div className="overflow-y-auto border-b border-rose-100 p-4 lg:border-b-0 lg:border-r lg:p-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Excel file</label>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={(e) => void handleExcelFileChange(e.target.files?.[0] || null)}
                      className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2"
                    />
                    {excelFile ? (
                      <p className="mt-1 text-xs text-gray-500 truncate">{excelFile.name}</p>
                    ) : null}
                  </div>

                  {parsingPreview ? (
                    <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">
                      Parsing and extracting rows...
                    </div>
                  ) : null}

                  {previewParseError ? (
                    <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {previewParseError}
                    </div>
                  ) : null}

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-sky-100 bg-white px-3 py-2">
                      <div className="text-[11px] uppercase tracking-wide text-gray-500">Sheet</div>
                      <div className="text-sm font-semibold text-gray-900 truncate">
                        {previewSheetName || "-"}
                      </div>
                    </div>
                    <div className="rounded-xl border border-sky-100 bg-white px-3 py-2">
                      <div className="text-[11px] uppercase tracking-wide text-gray-500">Rows</div>
                      <div className="text-sm font-semibold text-gray-900">{previewRows.length}</div>
                    </div>
                    <div className="rounded-xl border border-emerald-100 bg-white px-3 py-2">
                      <div className="text-[11px] uppercase tracking-wide text-gray-500">Ready</div>
                      <div className="text-sm font-semibold text-emerald-700">{readyPreviewRows}</div>
                    </div>
                    <div className="rounded-xl border border-amber-100 bg-white px-3 py-2">
                      <div className="text-[11px] uppercase tracking-wide text-gray-500">Duplicates</div>
                      <div className="text-sm font-semibold text-amber-700">{rowCountWithDuplicates}</div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white px-3 py-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                      Imported from Excel mapping
                    </div>
                    <p className="mt-1 text-[11px] leading-4 text-sky-800/80">
                      Use any matching header name. For <span className="font-medium">Emails</span> and <span className="font-medium">Phones</span>, only the first value is used.
                    </p>
                    <div className="mt-2 max-h-40 space-y-1.5 overflow-auto pr-1">
                      {IMPORT_COLUMN_HELPER.map((item) => (
                        <div key={item.field} className="rounded-lg border border-sky-100 bg-white/90 px-2 py-1.5">
                          <div className="text-[11px] font-semibold text-gray-800">{item.field}</div>
                          <div className="text-[11px] leading-4 text-gray-600">{item.headers}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-rose-100 bg-white px-3 py-3">
                    <div className="text-xs text-gray-500">Assigned CRM reps for this import</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selectedAssignees.length > 0 ? (
                        selectedAssignees.map((agent) => (
                          <span
                            key={agent._id}
                            className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs text-rose-700"
                          >
                            {agent.username || agent.email}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-600">
                          Auto-distribute among all active CRM agents
                        </span>
                      )}
                    </div>
                  </div>

                  {duplicateIssues.length > 0 ? (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
                      <div className="text-sm font-semibold text-amber-800">Duplicate entries detected</div>
                      <p className="mt-1 text-xs text-amber-700">
                        Remove duplicate list items from the file before importing.
                      </p>
                      <ul className="mt-2 max-h-32 space-y-1 overflow-auto text-xs text-amber-800">
                        {duplicateIssues.slice(0, 12).map((issue, idx) => (
                          <li key={`${issue.rowNumber}-${idx}`}>
                            Row {issue.rowNumber}: {issue.reason}
                          </li>
                        ))}
                        {duplicateIssues.length > 12 ? (
                          <li>+{duplicateIssues.length - 12} more duplicate alerts</li>
                        ) : null}
                      </ul>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => void onImportLeads()}
                    disabled={
                      importing ||
                      parsingPreview ||
                      !excelFile ||
                      previewRows.length === 0 ||
                      duplicateIssues.length > 0
                    }
                    className="mt-5 w-full rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {importing ? "Importing..." : "Import Leads to CRM"}
                  </button>
                </div>

                <div className="min-h-0 overflow-hidden p-4 lg:p-5">
                  <div className="h-full overflow-auto rounded-2xl border border-rose-100 bg-white">
                    <div className="sticky top-0 z-10 border-b border-rose-100 bg-gradient-to-r from-rose-50 to-sky-50 px-4 py-3">
                      <div className="text-sm font-semibold text-gray-900">Extracted lead details</div>
                      <div className="text-xs text-gray-600">
                        Preview of parsed columns including lists, socials, location, industry, and website.
                      </div>
                    </div>

                    {previewRows.length === 0 ? (
                      <div className="px-4 py-10 text-center text-sm text-gray-500">
                        Choose an Excel file to extract and preview lead rows.
                      </div>
                    ) : (
                      <div className="divide-y divide-rose-50">
                        {previewRows.map((row) => {
                          const issues = duplicateIssuesByRow.get(row.rowNumber) || [];
                          const hasIssue = issues.length > 0;
                          return (
                            <div
                              key={`${row.rowNumber}-${row.duplicateKey}`}
                              className={`px-4 py-3 ${hasIssue ? "bg-amber-50/60" : "bg-white"}`}
                            >
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <div className="text-xs text-gray-500">Row {row.rowNumber}</div>
                                  <div className="text-sm font-semibold text-gray-900">{row.clientName}</div>
                                  <div className="text-xs text-gray-600">
                                    {row.title} • {row.companyName || "No company"}
                                  </div>
                                </div>
                                <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] text-sky-700">
                                  {issues.length > 0 ? "Needs Fix" : "Ready"}
                                </span>
                              </div>

                              <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-gray-700 md:grid-cols-2">
                                <div><span className="font-medium">Email:</span> {row.email || "-"}</div>
                                <div><span className="font-medium">Phone:</span> {row.phone || "-"}</div>
                                <div><span className="font-medium">Lists:</span> {row.lists.join(", ") || "-"}</div>
                                <div><span className="font-medium">Socials:</span> {row.socials || "-"}</div>
                                <div><span className="font-medium">Location:</span> {row.location || "-"}</div>
                                <div><span className="font-medium">Industry:</span> {row.industry || "-"}</div>
                                <div className="md:col-span-2"><span className="font-medium">Website:</span> {row.website || "-"}</div>
                                {row.notes ? (
                                  <div className="md:col-span-2"><span className="font-medium">Notes:</span> {row.notes}</div>
                                ) : null}
                              </div>

                              {hasIssue ? (
                                <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs text-amber-800">
                                  {issues.map((reason, idx) => (
                                    <li key={`${row.rowNumber}-${idx}`}>{reason}</li>
                                  ))}
                                </ul>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
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
