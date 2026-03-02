"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js";
import { Doughnut, Bar, Line, Pie } from "react-chartjs-2";

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);

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
  dueDate?: string;
  latestComment?: string;
  latestAttachmentUrls?: string[];
  latestRecordingUrl?: string;
  updates?: CrmLeadUpdateItem[];
  assignedTo?: { _id: string; email?: string; username?: string; role?: string };
  assignedBy?: { _id: string; email?: string; username?: string; role?: string };
  createdAt: string;
  updatedAt?: string;
};

type LeadsResponse = {
  items: CrmLeadItem[];
  total: number;
  page: number;
  limit: number;
};

type CrmLeadUpdateItem = {
  _id?: string;
  comment?: string;
  status?: string;
  attachmentUrls?: string[];
  recordingUrl?: string;
  createdBy?: { _id?: string; email?: string; username?: string; role?: string };
  createdAt?: string;
  editedAt?: string;
  isDeleted?: boolean;
  deletedAt?: string;
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

type AssignmentByUploadItem = {
  sourceBatchId: string;
  sourceFileName?: string;
  importedAt: string;
  leadCount: number;
  overdueCount: number;
  agentId: string;
  agentEmail?: string;
  agentUsername?: string;
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

const MONTH_OPTIONS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
] as const;

const IMPORT_COLUMN_HELPER = [
  { field: "Client Name", headers: "Contact Full Name, First Name + Last Name, Client Name, Contact Name, Name" },
  { field: "Title", headers: "Title, Task, Task Title, Designation, Role" },
  { field: "Company", headers: "Company Name - Cleaned, Company Name, Company, Business, Organization" },
  { field: "Email", headers: "Email 1, Email 2, Personal Email, Email, Email Address" },
  { field: "Phone", headers: "Contact Phone 1/2/3, Contact Mobile Phone, Company Phone 1/2/3, Phone" },
  { field: "Lists", headers: "List, Lists, List Name, Lead List, Segment, Tags" },
  { field: "Socials", headers: "Contact LI Profile URL, Company LI Profile Url, Contact Socials" },
  { field: "Location", headers: "Company Location, Contact Location, Company City/State/Country, Contact City/State/Country" },
  { field: "Industry", headers: "Company Industry, Industry, Sector" },
  { field: "Website", headers: "Website, Company Website Domain, Site, URL, Web" },
  { field: "Notes", headers: "Company Description, Department, Seniority, Revenue, Staff Count, SIC/NAICS, Research Date" },
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

function deriveProvidedClientName(rowLookup: Record<string, unknown>): string {
  const fullName = toText(
    pickField(rowLookup, [
      "contact full name",
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
  if (fullName) return fullName;

  const firstName = toText(pickField(rowLookup, ["first name", "firstname"]));
  const lastName = toText(pickField(rowLookup, ["last name", "lastname"]));
  return [firstName, lastName].filter(Boolean).join(" ").trim();
}

function composeSocials(rowLookup: Record<string, unknown>): string {
  const values: string[] = [];
  const seen = new Set<string>();

  const add = (value: unknown) => {
    const raw = toText(value);
    if (!raw) return;
    const parts = raw
      .split(/[\n,;|]+/g)
      .map((item) => item.trim())
      .filter(Boolean);
    for (const part of parts) {
      const key = part.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      values.push(part);
    }
  };

  add(pickField(rowLookup, ["contact socials", "social", "socials", "social links"]));
  add(pickField(rowLookup, ["contact li profile url", "contact linkedin", "linkedin", "linkedin profile"]));
  add(pickField(rowLookup, ["company li profile url", "company linkedin"]));

  return values.join(", ");
}

function composeLocation(rowLookup: Record<string, unknown>): string {
  const direct = toText(
    pickField(rowLookup, ["company location", "contact location", "location", "address"])
  );
  if (direct) return direct;

  const companyCity = toText(pickField(rowLookup, ["company city"]));
  const companyState = toText(pickField(rowLookup, ["company state", "company state abbr"]));
  const companyCountry = toText(pickField(rowLookup, ["company country", "company country (alpha 2)", "company country (alpha 3)"]));
  const companyLocation = [companyCity, companyState, companyCountry].filter(Boolean).join(", ");
  if (companyLocation) return companyLocation;

  const contactCity = toText(pickField(rowLookup, ["contact city"]));
  const contactState = toText(pickField(rowLookup, ["contact state", "contact state abbr"]));
  const contactCountry = toText(pickField(rowLookup, ["contact country", "contact country (alpha 2)", "contact country (alpha 3)"]));
  return [contactCity, contactState, contactCountry].filter(Boolean).join(", ");
}

function composeNotes(rowLookup: Record<string, unknown>): string {
  const values: string[] = [];
  const seen = new Set<string>();

  const addRaw = (value: unknown) => {
    const text = toText(value);
    if (!text) return;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    values.push(text);
  };

  const addLabel = (label: string, candidates: string[]) => {
    const text = toText(pickField(rowLookup, candidates));
    if (!text) return;
    const entry = `${label}: ${text}`;
    const key = entry.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    values.push(entry);
  };

  addRaw(pickField(rowLookup, ["notes", "note", "comments", "comment", "remarks"]));
  addLabel("Research Date", ["research date"]);
  addLabel("Department", ["department"]);
  addLabel("Seniority", ["seniority"]);
  addLabel("Company Description", ["company description", "description"]);
  addLabel("Company Annual Revenue", ["company annual revenue"]);
  addLabel("Company Revenue Range", ["company revenue range"]);
  addLabel("Company Staff Count", ["company staff count"]);
  addLabel("Company Staff Count Range", ["company staff count range"]);
  addLabel("Company Founded Date", ["company founded date"]);
  addLabel("Company Post Code", ["company post code"]);
  addLabel("SIC Code", ["sic code"]);
  addLabel("NAICS Code", ["naics code"]);

  return values.join(" | ");
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

function toDateTimeValue(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "-";
  return date.toLocaleString();
}

function leadUpdateAuthorLabel(update: CrmLeadUpdateItem): string {
  const name = update.createdBy?.username || update.createdBy?.email || "Unknown";
  const role = String(update.createdBy?.role || "").toLowerCase();
  if (role === "admin" || role === "superadmin") return `${name} (Admin)`;
  return `${name} (CRM)`;
}

function sortedLeadUpdates(updates?: CrmLeadUpdateItem[]): CrmLeadUpdateItem[] {
  if (!Array.isArray(updates)) return [];
  return [...updates].sort((a, b) => {
    const aTime = new Date(a.createdAt || 0).getTime();
    const bTime = new Date(b.createdAt || 0).getTime();
    return bTime - aTime;
  });
}

function isLikelyImageUrl(url?: string): boolean {
  const clean = String(url || "").trim().split("?")[0].toLowerCase();
  return /\.(png|jpe?g|gif|webp|bmp|heic|heif|svg)$/i.test(clean);
}

function normalizeUpdateId(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object") return "";

  const maybeOid = toText((value as { $oid?: unknown }).$oid);
  if (maybeOid) return maybeOid;

  const nested = toText((value as { _id?: unknown })._id);
  if (nested && nested !== "[object Object]") return nested;

  const maybeHex = (value as { toHexString?: () => string }).toHexString;
  if (typeof maybeHex === "function") {
    const out = toText(maybeHex.call(value));
    if (out) return out;
  }

  const fallback = toText(value);
  return fallback === "[object Object]" ? "" : fallback;
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
      pickField(row, ["title", "task", "task title", "designation", "role", "job title", "position"])
    );
    const title = providedTitle || "CRM Follow-up";
    const companyName = toText(
      pickField(row, ["company name - cleaned", "company", "company name", "business", "organization"])
    );
    const providedClientName = deriveProvidedClientName(row);
    const email = extractPrimaryEmail(
      pickField(row, ["email 1", "email 2", "personal email", "email", "emails", "email address", "mail", "e-mail"])
    );
    const phone = extractPrimaryPhone(
      pickField(row, [
        "contact phone 1",
        "contact phone 2",
        "contact phone 3",
        "contact mobile phone",
        "contact mobile phone 2",
        "contact mobile phone 3",
        "company phone 1",
        "company phone 2",
        "company phone 3",
        "phone",
        "phones",
        "phone number",
        "number",
        "mobile",
        "contact number",
        "telephone",
      ])
    );
    const clientName = deriveClientName({
      providedClientName,
      title: providedTitle,
      companyName,
      email,
    });
    const socials = composeSocials(row);
    const location = composeLocation(row);
    const industry = toText(pickField(row, ["company industry", "industry", "sector"]));
    const website = toText(pickField(row, ["website", "company website domain", "site", "url", "web"]));
    const notes = composeNotes(row);

    const listInfo = splitListValues(
      pickField(row, ["list", "lists", "list name", "lead list", "segment", "tags"])
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
  const [leadAssignedTo, setLeadAssignedTo] = useState<string>("");
  const [leadMonth, setLeadMonth] = useState<string>("");
  const [leadYear, setLeadYear] = useState<string>("");
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null);
  const [leadDetailsLoadingId, setLeadDetailsLoadingId] = useState<string | null>(null);
  const [showLeadDetailsModal, setShowLeadDetailsModal] = useState(false);
  const [activeLeadDetails, setActiveLeadDetails] = useState<CrmLeadItem | null>(null);
  const [leadDetailsError, setLeadDetailsError] = useState("");
  const [adminReply, setAdminReply] = useState("");
  const [adminReplyStatus, setAdminReplyStatus] = useState<string>("");
  const [submittingAdminReply, setSubmittingAdminReply] = useState(false);
  const [timelineBusyKey, setTimelineBusyKey] = useState<string | null>(null);
  const [editingUpdateId, setEditingUpdateId] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState("");
  const [editingStatus, setEditingStatus] = useState<string>("pending");

  const [importFiles, setImportFiles] = useState<ImportFilesResponse | null>(null);
  const [loadingImportFiles, setLoadingImportFiles] = useState(false);
  const [deletingBatchId, setDeletingBatchId] = useState<string | null>(null);

  const [assignmentsByUpload, setAssignmentsByUpload] = useState<AssignmentByUploadItem[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [taskStartDate, setTaskStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [importing, setImporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCrmOpsModal, setShowCrmOpsModal] = useState(false);
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

  const leadDateRange = useMemo(() => {
    const year = Number.parseInt(leadYear, 10);
    const month = Number.parseInt(leadMonth, 10);
    if (!Number.isFinite(year) || year < 1970 || year > 9999) {
      return { from: "", to: "" };
    }

    if (Number.isFinite(month) && month >= 1 && month <= 12) {
      const from = new Date(Date.UTC(year, month - 1, 1));
      const to = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
      return {
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
      };
    }

    return {
      from: `${year}-01-01`,
      to: `${year}-12-31`,
    };
  }, [leadMonth, leadYear]);

  const leadQuery = useMemo(() => {
    const p = new URLSearchParams();
    if (leadQ.trim()) p.set("q", leadQ.trim());
    if (leadStatus) p.set("status", leadStatus);
    if (leadAssignedTo) p.set("assignedTo", leadAssignedTo);
    if (leadDateRange.from) p.set("from", leadDateRange.from);
    if (leadDateRange.to) p.set("to", leadDateRange.to);
    p.set("page", "1");
    p.set("limit", "100");
    return p.toString();
  }, [leadAssignedTo, leadDateRange.from, leadDateRange.to, leadQ, leadStatus]);

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

  async function loadAssignmentsByUpload() {
    setLoadingAssignments(true);
    try {
      const res = await fetch(`/api/admin/crm/assignments-by-upload`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to load assignments");
      setAssignmentsByUpload(Array.isArray(json?.items) ? json.items : []);
    } catch (e: unknown) {
      pushToast(e instanceof Error ? e.message : "Failed to load assignment distribution", "error");
    } finally {
      setLoadingAssignments(false);
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
    loadAssignmentsByUpload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!leadAssignedTo) return;
    setSelectedUserIds((prev) => (prev.length === 1 && prev[0] === leadAssignedTo ? prev : [leadAssignedTo]));
  }, [leadAssignedTo]);

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
      const effectiveAssigneeIds = leadAssignedTo ? [leadAssignedTo] : selectedUserIds;
      if (effectiveAssigneeIds.length > 0) {
        formData.append("assignedToUserIds", JSON.stringify(effectiveAssigneeIds));
      }
      if (taskStartDate) formData.append("taskStartDate", taskStartDate);
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

  async function deleteLead(lead: CrmLeadItem) {
    const label = lead.clientName || lead.email || "this lead";
    const ok = window.confirm(
      `Permanently delete lead "${label}"? This will also delete all updates, attachments, and recordings associated with it.`
    );
    if (!ok) return;

    try {
      setDeletingLeadId(lead._id);
      const res = await fetch(`/api/admin/crm/leads/${encodeURIComponent(lead._id)}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to delete lead");

      pushToast(`Lead "${label}" deleted`, "success");
      if (activeLeadDetails?._id === lead._id) {
        closeLeadDetailsModal();
      }
      await loadLeads();
    } catch (e: unknown) {
      pushToast(e instanceof Error ? e.message : "Failed to delete lead", "error");
    } finally {
      setDeletingLeadId(null);
    }
  }

  function closeLeadDetailsModal() {
    if (submittingAdminReply) return;
    setShowLeadDetailsModal(false);
    setActiveLeadDetails(null);
    setLeadDetailsError("");
    setAdminReply("");
    setAdminReplyStatus("");
    setTimelineBusyKey(null);
    setEditingUpdateId(null);
    setEditingComment("");
    setEditingStatus("pending");
  }

  async function openLeadDetailsModal(leadId: string) {
    setShowLeadDetailsModal(true);
    setLeadDetailsLoadingId(leadId);
    setLeadDetailsError("");
    setAdminReply("");

    try {
      const res = await fetch(`/api/admin/crm/leads/${leadId}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to load lead details");

      const item = json?.item as CrmLeadItem;
      setActiveLeadDetails(item);
      setAdminReplyStatus(item?.status || "pending");
      setEditingStatus(item?.status || "pending");
    } catch (e: unknown) {
      setLeadDetailsError(e instanceof Error ? e.message : "Failed to load lead details");
    } finally {
      setLeadDetailsLoadingId(null);
    }
  }

  function applyLeadMutation(item: CrmLeadItem) {
    setActiveLeadDetails(item);
    setLeads((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: (prev.items || []).map((lead) => (lead._id === item._id ? item : lead)),
      };
    });
  }

  function beginEditLeadUpdate(update: CrmLeadUpdateItem) {
    const updateId = normalizeUpdateId(update?._id);
    if (!updateId) return;
    setEditingUpdateId(updateId);
    setEditingComment(update.comment || "");
    setEditingStatus(update.status || activeLeadDetails?.status || "pending");
  }

  function cancelEditLeadUpdate() {
    setEditingUpdateId(null);
    setEditingComment("");
    setEditingStatus(activeLeadDetails?.status || "pending");
  }

  async function saveEditedLeadUpdate(update: CrmLeadUpdateItem) {
    const leadId = toText(activeLeadDetails?._id);
    const updateId = normalizeUpdateId(update?._id);
    if (!leadId || !updateId) return;
    const safeLeadId = encodeURIComponent(leadId);
    const safeUpdateId = encodeURIComponent(updateId);

    try {
      setTimelineBusyKey(`edit:${updateId}`);
      const res = await fetch(`/api/admin/crm/leads/${safeLeadId}/updates/${safeUpdateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment: editingComment,
          status: editingStatus,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to edit update");

      const item = json?.item as CrmLeadItem;
      applyLeadMutation(item);
      setEditingUpdateId(null);
      setEditingComment("");
      pushToast("Update edited", "success");
    } catch (e: unknown) {
      pushToast(e instanceof Error ? e.message : "Failed to edit update", "error");
    } finally {
      setTimelineBusyKey(null);
    }
  }

  async function deleteLeadUpdate(update: CrmLeadUpdateItem) {
    const leadId = toText(activeLeadDetails?._id);
    const updateId = normalizeUpdateId(update?._id);
    if (!leadId || !updateId) return;
    const safeLeadId = encodeURIComponent(leadId);
    const safeUpdateId = encodeURIComponent(updateId);
    const ok = window.confirm("Delete this update and all media attached to it?");
    if (!ok) return;

    try {
      setTimelineBusyKey(`delete:${updateId}`);
      const res = await fetch(`/api/admin/crm/leads/${safeLeadId}/updates/${safeUpdateId}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to delete update");

      const item = json?.item as CrmLeadItem;
      applyLeadMutation(item);
      pushToast("Update deleted", "success");
    } catch (e: unknown) {
      pushToast(e instanceof Error ? e.message : "Failed to delete update", "error");
    } finally {
      setTimelineBusyKey(null);
    }
  }

  async function deleteLeadUpdateAttachment(update: CrmLeadUpdateItem, url: string) {
    const leadId = toText(activeLeadDetails?._id);
    const updateId = normalizeUpdateId(update?._id);
    if (!leadId || !updateId || !url) return;
    const safeLeadId = encodeURIComponent(leadId);
    const safeUpdateId = encodeURIComponent(updateId);

    try {
      setTimelineBusyKey(`attachment:${updateId}:${url}`);
      const res = await fetch(`/api/admin/crm/leads/${safeLeadId}/updates/${safeUpdateId}/attachments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: [url] }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to delete attachment");

      const item = json?.item as CrmLeadItem;
      applyLeadMutation(item);
      pushToast("Attachment removed", "success");
    } catch (e: unknown) {
      pushToast(e instanceof Error ? e.message : "Failed to delete attachment", "error");
    } finally {
      setTimelineBusyKey(null);
    }
  }

  async function deleteLeadUpdateRecording(update: CrmLeadUpdateItem) {
    const leadId = toText(activeLeadDetails?._id);
    const updateId = normalizeUpdateId(update?._id);
    if (!leadId || !updateId) return;
    const safeLeadId = encodeURIComponent(leadId);
    const safeUpdateId = encodeURIComponent(updateId);

    try {
      setTimelineBusyKey(`recording:${updateId}`);
      const res = await fetch(`/api/admin/crm/leads/${safeLeadId}/updates/${safeUpdateId}/recording`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to delete recording");

      const item = json?.item as CrmLeadItem;
      applyLeadMutation(item);
      pushToast("Voice recording deleted", "success");
    } catch (e: unknown) {
      pushToast(e instanceof Error ? e.message : "Failed to delete recording", "error");
    } finally {
      setTimelineBusyKey(null);
    }
  }

  async function submitAdminLeadReply() {
    if (!activeLeadDetails) return;
    const comment = adminReply.trim();
    if (!comment) {
      pushToast("Reply comment is required", "error");
      return;
    }

    try {
      setSubmittingAdminReply(true);
      const res = await fetch(`/api/admin/crm/leads/${activeLeadDetails._id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment,
          status: adminReplyStatus || activeLeadDetails.status,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to submit admin reply");

      const item = json?.item as CrmLeadItem;
      setActiveLeadDetails(item);
      setAdminReply("");
      setAdminReplyStatus(item?.status || adminReplyStatus);
      pushToast("Reply sent to CRM thread", "success");
      await loadLeads();
    } catch (e: unknown) {
      pushToast(e instanceof Error ? e.message : "Failed to submit admin reply", "error");
    } finally {
      setSubmittingAdminReply(false);
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
  const effectiveImportAssigneeIds = useMemo(
    () => (leadAssignedTo ? [leadAssignedTo] : selectedUserIds),
    [leadAssignedTo, selectedUserIds]
  );
  const selectedAssignees = useMemo(
    () => (users?.items || []).filter((u) => effectiveImportAssigneeIds.includes(u._id)),
    [effectiveImportAssigneeIds, users?.items]
  );
  const activeLeadUpdates = useMemo(
    () => sortedLeadUpdates(activeLeadDetails?.updates),
    [activeLeadDetails?.updates]
  );
  const crmAgentUsers = useMemo(
    () => (users?.items || []).filter((u) => u.isCrmAgent),
    [users?.items]
  );
  const overdueLeadsCount = useMemo(() => {
    const now = Date.now();
    return (leads?.items || []).filter((lead) => {
      if (lead.status === "completed") return false;
      if (!lead.dueDate) return false;
      const due = new Date(lead.dueDate);
      return Number.isFinite(due.getTime()) && due.getTime() < now;
    }).length;
  }, [leads?.items]);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const out = new Set<number>([currentYear, currentYear - 1, currentYear + 1]);
    (leads?.items || []).forEach((lead) => {
      const dt = new Date(lead.createdAt || "");
      if (Number.isFinite(dt.getTime())) out.add(dt.getFullYear());
    });
    return [...out].sort((a, b) => b - a);
  }, [leads?.items]);

  const crmVsNonCrmChartData = useMemo(() => {
    const nonCrmCount = Math.max(totalUsersCount - crmUsersCount, 0);
    return {
      labels: ["CRM Agents", "Non-CRM Users"],
      datasets: [
        {
          data: [crmUsersCount, nonCrmCount],
          backgroundColor: ["rgba(14,165,233,0.85)", "rgba(148,163,184,0.8)"],
          borderColor: ["#0284C7", "#64748B"],
          borderWidth: 1,
        },
      ],
    };
  }, [crmUsersCount, totalUsersCount]);

  const leadStatusChartData = useMemo(() => {
    const counts = CRM_STATUSES.map((status) =>
      (leads?.items || []).filter((lead) => lead.status === status).length
    );
    return {
      labels: CRM_STATUSES.map((status) => statusLabel(status)),
      datasets: [
        {
          label: "Leads",
          data: counts,
          backgroundColor: ["#64748B", "#0EA5E9", "#16A34A", "#F59E0B", "#EF4444"],
          borderRadius: 6,
        },
      ],
    };
  }, [leads?.items]);

  const importTrendChartData = useMemo(() => {
    const items = (importFiles?.items || []).slice(0, 7).reverse();
    return {
      labels: items.map((item, idx) => (item.sourceFileName || `Batch ${idx + 1}`).slice(0, 16)),
      datasets: [
        {
          label: "Imported leads",
          data: items.map((item) => item.leadCount),
          borderColor: "#F43F5E",
          backgroundColor: "rgba(244,63,94,0.18)",
          fill: true,
          tension: 0.35,
          pointRadius: 2,
        },
      ],
    };
  }, [importFiles?.items]);

  const compactChartOptions = useMemo<ChartOptions<"bar">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: {
          ticks: { color: "#475569", font: { size: 11 } },
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: { color: "#475569", font: { size: 11 }, precision: 0 },
          grid: { color: "rgba(148,163,184,0.25)" },
        },
      },
    }),
    []
  );

  const compactLineOptions = useMemo<ChartOptions<"line">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: {
          ticks: { color: "#475569", font: { size: 11 } },
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: { color: "#475569", font: { size: 11 }, precision: 0 },
          grid: { color: "rgba(148,163,184,0.25)" },
        },
      },
    }),
    []
  );

  const leadStatusPieData = useMemo(() => {
    const items = leads?.items || [];
    const counts = CRM_STATUSES.map((s) => items.filter((l) => l.status === s).length);
    return {
      labels: CRM_STATUSES.map(statusLabel),
      datasets: [{
        data: counts,
        backgroundColor: [
          "rgba(100,116,139,0.8)",
          "rgba(14,165,233,0.8)",
          "rgba(22,163,74,0.8)",
          "rgba(245,158,11,0.8)",
          "rgba(239,68,68,0.8)",
        ],
        borderColor: ["#64748B", "#0EA5E9", "#16A34A", "#F59E0B", "#EF4444"],
        borderWidth: 1.5,
      }],
    };
  }, [leads?.items]);

  const leadsPerAgentData = useMemo(() => {
    const agentMap = new Map<string, number>();
    (leads?.items || []).forEach((lead) => {
      const name = lead.assignedTo?.username || lead.assignedTo?.email || "Unassigned";
      agentMap.set(name, (agentMap.get(name) || 0) + 1);
    });
    const entries = [...agentMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    return {
      labels: entries.map(([name]) => name.length > 14 ? name.slice(0, 14) + "..." : name),
      datasets: [{
        label: "Leads",
        data: entries.map(([, count]) => count),
        backgroundColor: "rgba(244,63,94,0.75)",
        borderColor: "#F43F5E",
        borderWidth: 1,
        borderRadius: 6,
      }],
    };
  }, [leads?.items]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-rose-50">
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <section className="rounded-3xl border border-rose-200/80 bg-gradient-to-br from-white via-rose-50/40 to-sky-50/30 p-5 md:p-6 shadow-[0_14px_40px_rgba(15,23,42,0.12)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 md:text-2xl">CRM Control Center</h1>
              <p className="text-gray-600 text-sm">Assign CRM roles, import lead sheets, and monitor task activity.</p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <select
                  value={leadAssignedTo}
                  onChange={(e) => setLeadAssignedTo(e.target.value)}
                  className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm shadow-sm"
                >
                  <option value="">Salesperson: All CRM Agents</option>
                  {crmAgentUsers.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.username || u.email}
                    </option>
                  ))}
                </select>

                <select
                  value={leadMonth}
                  onChange={(e) => setLeadMonth(e.target.value)}
                  className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm shadow-sm"
                >
                  <option value="">Month: All</option>
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>

                <select
                  value={leadYear}
                  onChange={(e) => setLeadYear(e.target.value)}
                  className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm shadow-sm"
                >
                  <option value="">Year: All</option>
                  {yearOptions.map((year) => (
                    <option key={year} value={String(year)}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="rounded-2xl border border-rose-200/80 bg-gradient-to-br from-rose-50 to-white px-4 py-2.5 shadow-[0_4px_14px_rgba(244,63,94,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">CRM Agents</div>
                <div className="text-xl font-bold text-rose-700">{crmUsersCount}</div>
              </div>
              <div className="rounded-2xl border border-sky-200/80 bg-gradient-to-br from-sky-50 to-white px-4 py-2.5 shadow-[0_4px_14px_rgba(14,165,233,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Total Leads Assignment</div>
                <div className="text-xl font-bold text-sky-700">{leads?.total || 0}</div>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white px-4 py-2.5 shadow-[0_4px_14px_rgba(100,116,139,0.10),inset_0_1px_0_rgba(255,255,255,0.8)]">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Total Users</div>
                <div className="text-xl font-bold text-gray-900">{totalUsersCount}</div>
              </div>
              <div className="rounded-2xl border border-red-200/80 bg-gradient-to-br from-red-50 to-white px-4 py-2.5 shadow-[0_4px_14px_rgba(239,68,68,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Overdue Assignment</div>
                <div className="text-xl font-bold text-red-700">{overdueLeadsCount}</div>
              </div>
              <button
                type="button"
                onClick={() => setShowCrmOpsModal(true)}
                title="CRM Team Operations"
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 px-4 py-2.5 text-white shadow-[0_6px_20px_rgba(14,165,233,0.35),0_2px_6px_rgba(0,0,0,0.10)] transition-all hover:shadow-[0_8px_28px_rgba(14,165,233,0.45)] hover:brightness-105 active:scale-[0.97]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span className="text-sm font-semibold hidden sm:inline">Team Ops</span>
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="rounded-3xl border border-rose-200/80 bg-gradient-to-br from-white via-rose-50/50 to-sky-50/40 p-4 md:p-5 shadow-[0_10px_36px_rgba(15,23,42,0.10)]">
            <h2 className="text-base font-semibold text-gray-900">Lead Status Distribution</h2>
            <p className="text-xs text-gray-500 mt-0.5">Breakdown of all leads by current status.</p>
            <div className="mt-3 h-52 sm:h-56">
              <Pie
                data={leadStatusPieData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: "right", labels: { boxWidth: 10, font: { size: 11 }, padding: 8 } } },
                }}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-rose-200/80 bg-gradient-to-br from-white via-sky-50/50 to-rose-50/40 p-4 md:p-5 shadow-[0_10px_36px_rgba(15,23,42,0.10)]">
            <h2 className="text-base font-semibold text-gray-900">Leads per Agent</h2>
            <p className="text-xs text-gray-500 mt-0.5">Top assigned CRM agents by lead count.</p>
            <div className="mt-3 h-52 sm:h-56">
              <Bar data={leadsPerAgentData} options={compactChartOptions} />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-rose-200/80 bg-gradient-to-br from-white via-rose-50/60 to-amber-50/40 p-5 md:p-6 shadow-[0_12px_40px_rgba(15,23,42,0.12)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Import Leads (Excel)</h2>
              <p className="text-sm text-gray-600 mt-0.5">
                Upload Excel, preview extracted rows, and block duplicate entries before import.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 px-6 py-3 text-sm font-bold text-white shadow-[0_6px_20px_rgba(244,63,94,0.35)] transition-all hover:shadow-[0_8px_28px_rgba(244,63,94,0.45)] hover:brightness-105 active:scale-[0.97]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12" /></svg>
              Open Upload Preview
            </button>
          </div>

          {excelFile ? (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              {excelFile.name}
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-rose-200/90 bg-gradient-to-br from-white via-rose-50/70 to-sky-50/60 p-4 md:p-5 shadow-[0_16px_44px_rgba(15,23,42,0.14)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Lead Activity</h2>
              <p className="text-sm text-gray-600">Latest CRM tasks across all assigned agents.</p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <input
                value={leadQ}
                onChange={(e) => setLeadQ(e.target.value)}
                placeholder="Search lead, email, phone"
                className="rounded-xl border border-gray-300 bg-white px-3 py-2 shadow-sm"
              />
              <select
                value={leadStatus}
                onChange={(e) => setLeadStatus(e.target.value)}
                className="rounded-xl border border-gray-300 bg-white px-3 py-2 shadow-sm"
              >
                <option value="">All statuses</option>
                {CRM_STATUSES.map((s) => (
                  <option key={s} value={s}>{statusLabel(s)}</option>
                ))}
              </select>
              <select
                value={leadAssignedTo}
                onChange={(e) => setLeadAssignedTo(e.target.value)}
                className="rounded-xl border border-gray-300 bg-white px-3 py-2 shadow-sm"
              >
                <option value="">All agents</option>
                {crmAgentUsers.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.username || u.email}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {leadAssignedTo ? (
            <div className="mt-3 inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700 shadow-sm">
              Filtered by agent: {crmAgentUsers.find((u) => u._id === leadAssignedTo)?.username || crmAgentUsers.find((u) => u._id === leadAssignedTo)?.email || "Selected user"}
            </div>
          ) : null}

          <div className="mt-4 overflow-auto max-h-[420px] rounded-2xl border border-rose-100 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_8px_20px_rgba(15,23,42,0.08)]">
            <table className="min-w-full text-sm">
              <thead className="bg-rose-50 text-gray-600">
                <tr>
                  <th className="px-3 py-2 text-left">Lead</th>
                  <th className="px-3 py-2 text-left">Assigned To</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Dates</th>
                  <th className="px-3 py-2 text-left">Latest Comment</th>
                  <th className="px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingLeads ? (
                  <tr><td className="px-3 py-3 text-gray-500" colSpan={6}>Loading leads...</td></tr>
                ) : (leads?.items || []).length === 0 ? (
                  <tr><td className="px-3 py-3 text-gray-500" colSpan={6}>No CRM leads found</td></tr>
                ) : (
                  (leads?.items || []).map((lead) => (
                    <tr key={lead._id} className="border-t border-rose-100 transition-colors hover:bg-rose-50/60">
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
                        <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs text-sky-700 shadow-sm">
                          {statusLabel(lead.status)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-700 text-xs">
                        <div>Start: {toIsoDateValue(lead.taskStartDate) || "-"}</div>
                        <div>Due: {toIsoDateValue(lead.dueDate) || "-"}</div>
                      </td>
                      <td className="px-3 py-2 text-gray-700 max-w-[340px] truncate">{lead.latestComment || "-"}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => void openLeadDetailsModal(lead._id)}
                            disabled={leadDetailsLoadingId === lead._id}
                            className="inline-flex items-center gap-1 rounded-xl border border-sky-300 px-2.5 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-50 disabled:opacity-60"
                          >
                            {leadDetailsLoadingId === lead._id ? "Opening..." : "View"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteLead(lead)}
                            disabled={deletingLeadId === lead._id}
                            className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-700 shadow-sm transition hover:bg-red-50 hover:shadow-[0_2px_8px_rgba(239,68,68,0.15)] disabled:opacity-60"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            {deletingLeadId === lead._id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-rose-200/80 bg-gradient-to-br from-white via-amber-50/30 to-rose-50/50 p-4 md:p-5 shadow-[0_10px_36px_rgba(15,23,42,0.10)]">
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
              className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-sky-200 bg-white px-4 py-2 text-sm font-medium text-sky-700 shadow-[0_2px_8px_rgba(14,165,233,0.10)] transition hover:bg-sky-50 hover:shadow-[0_4px_12px_rgba(14,165,233,0.15)] disabled:opacity-60"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              {loadingImportFiles ? "Refreshing..." : "Refresh Files"}
            </button>
          </div>

          <div className="mt-4 overflow-auto max-h-[360px] rounded-2xl border border-rose-100 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_4px_14px_rgba(15,23,42,0.06)]">
            <table className="min-w-full text-sm">
              <thead className="bg-gradient-to-r from-rose-50 to-amber-50/60 text-gray-600">
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide">File</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide">Imported</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide">Leads</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingImportFiles ? (
                  <tr><td className="px-3 py-3 text-gray-500" colSpan={4}>Loading imported files...</td></tr>
                ) : (importFiles?.items || []).length === 0 ? (
                  <tr><td className="px-3 py-3 text-gray-500" colSpan={4}>No imported Excel files found</td></tr>
                ) : (
                  (importFiles?.items || []).map((item) => (
                    <tr key={item.sourceBatchId} className="border-t border-rose-100/80 transition-colors hover:bg-rose-50/40">
                      <td className="px-3 py-2.5">
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
                      <td className="px-3 py-2.5 text-xs text-gray-700">
                        <div>{toIsoDateValue(item.importedAt) || "-"}</div>
                        <div>Latest lead: {toIsoDateValue(item.latestLeadAt) || "-"}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700 shadow-sm">
                          {item.leadCount}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => void deleteImportedFile(item)}
                          disabled={deletingBatchId === item.sourceBatchId}
                          className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 shadow-sm transition hover:bg-red-50 hover:shadow-[0_2px_8px_rgba(239,68,68,0.15)] disabled:opacity-60"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          {deletingBatchId === item.sourceBatchId ? "Deleting..." : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-rose-200/80 bg-gradient-to-br from-white via-sky-50/30 to-rose-50/40 p-4 md:p-5 shadow-[0_10px_36px_rgba(15,23,42,0.10)]">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Assignment Distribution by Upload</h2>
              <p className="text-sm text-gray-600">
                Historical view of how leads from each upload batch were distributed across CRM agents.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadAssignmentsByUpload()}
              disabled={loadingAssignments}
              className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-sky-200 bg-white px-4 py-2 text-sm font-medium text-sky-700 shadow-[0_2px_8px_rgba(14,165,233,0.10)] transition hover:bg-sky-50 hover:shadow-[0_4px_12px_rgba(14,165,233,0.15)] disabled:opacity-60"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              {loadingAssignments ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div className="mt-4 overflow-auto max-h-[420px] rounded-2xl border border-rose-100 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_4px_14px_rgba(15,23,42,0.06)]">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-gradient-to-r from-sky-50 to-rose-50/60 text-gray-600">
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide">Upload File</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide">Imported</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide">Agent</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide">Leads</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide">Overdue</th>
                </tr>
              </thead>
              <tbody>
                {loadingAssignments ? (
                  <tr><td className="px-3 py-3 text-gray-500" colSpan={5}>Loading assignment distribution...</td></tr>
                ) : assignmentsByUpload.length === 0 ? (
                  <tr><td className="px-3 py-3 text-gray-500" colSpan={5}>No assignment data found</td></tr>
                ) : (
                  assignmentsByUpload.map((row, idx) => (
                    <tr key={`${row.sourceBatchId}-${row.agentId}-${idx}`} className="border-t border-rose-100/70 transition-colors hover:bg-rose-50/40">
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-gray-900 truncate max-w-[220px]">
                          {row.sourceFileName || "Unnamed file"}
                        </div>
                        <div className="text-[10px] text-gray-400 truncate max-w-[220px]">{row.sourceBatchId}</div>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-700">
                        {row.importedAt ? new Date(row.importedAt).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-gray-900">{row.agentUsername || row.agentEmail || "Unknown"}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700 shadow-sm">
                          {row.leadCount}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        {row.overdueCount > 0 ? (
                          <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 shadow-sm">
                            {row.overdueCount}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">0</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {showCrmOpsModal ? (
          <div className="fixed inset-0 z-[94] p-3 md:p-6 lg:p-8">
            <div
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]"
              onClick={() => setShowCrmOpsModal(false)}
            />

            <div className="relative mx-auto flex h-[92vh] max-w-7xl flex-col overflow-hidden rounded-3xl border border-sky-200/80 bg-gradient-to-br from-white via-sky-50/50 to-rose-50/40 shadow-[0_24px_64px_rgba(15,23,42,0.18)]">
              <div className="flex items-start justify-between gap-3 border-b border-sky-100 bg-gradient-to-r from-sky-50/60 to-transparent px-5 py-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">CRM Team Manager</h3>
                  <p className="text-sm text-gray-600">
                    Assign/remove CRM roles and monitor team distribution.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void loadUsers()}
                    disabled={loadingUsers}
                    className="rounded-xl border border-sky-200 bg-white px-3 py-1.5 text-xs font-medium text-sky-700 shadow-sm transition hover:bg-sky-50 disabled:opacity-60"
                  >
                    {loadingUsers ? "Refreshing..." : "Refresh"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCrmOpsModal(false)}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm transition hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden p-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:p-5">
                <div className="flex min-h-0 flex-col rounded-2xl border border-rose-100/80 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.06)]">
                  <div className="flex flex-col gap-3 md:flex-row md:items-end">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600">Search users</label>
                      <input
                        value={userQ}
                        onChange={(e) => setUserQ(e.target.value)}
                        placeholder="Email, username, company"
                        className="mt-1.5 w-full rounded-2xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.04),0_2px_8px_rgba(15,23,42,0.05)] transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600">CRM filter</label>
                      <select
                        value={crmFilter}
                        onChange={(e) => setCrmFilter(e.target.value as "all" | "crm" | "noncrm")}
                        className="mt-1.5 w-full rounded-2xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.04),0_2px_8px_rgba(15,23,42,0.05)] transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100 focus:outline-none"
                      >
                        <option value="all">All users</option>
                        <option value="crm">CRM only</option>
                        <option value="noncrm">Non-CRM only</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-sky-600">Agents</div>
                      <div className="text-lg font-bold text-sky-800">{crmUsersCount}</div>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total</div>
                      <div className="text-lg font-bold text-slate-800">{totalUsersCount}</div>
                    </div>
                    <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Selected</div>
                      <div className="text-lg font-bold text-emerald-800">{selectedUserIds.length}</div>
                    </div>
                  </div>

                  <div className="mt-4 min-h-0 flex-1 overflow-auto rounded-2xl border border-rose-100/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                    <table className="min-w-full text-sm">
                      <thead className="sticky top-0 z-10 bg-gradient-to-r from-rose-50 to-sky-50/40 text-gray-600">
                        <tr>
                          <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide">Assign</th>
                          <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide">User</th>
                          <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide">CRM Role</th>
                          <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide">Actions</th>
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
                              <tr key={u._id} className="border-t border-rose-100/70 transition-colors hover:bg-rose-50/40">
                                <td className="px-3 py-2.5">
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    disabled={!u.isCrmAgent}
                                    onChange={(e) => toggleSelectedUser(u._id, e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-200"
                                  />
                                </td>
                                <td className="px-3 py-2.5">
                                  <div className="font-medium text-gray-900">{u.email}</div>
                                  <div className="text-xs text-gray-500">{u.username || "-"} {u.companyName ? `• ${u.companyName}` : ""}</div>
                                </td>
                                <td className="px-3 py-2.5">
                                  <span className={`inline-flex rounded-full px-2.5 py-0.5 border text-xs font-medium shadow-sm ${u.isCrmAgent ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                                    {u.isCrmAgent ? "CRM Agent" : "Not Assigned"}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5">
                                  <button
                                    onClick={() => toggleCrmAgent(u)}
                                    disabled={updatingUserId === u._id || Boolean(u.isBlocked)}
                                    className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-medium shadow-sm transition disabled:opacity-50 ${
                                      u.isCrmAgent
                                        ? "border-red-200 bg-white text-red-700 hover:bg-red-50"
                                        : "border-sky-200 bg-white text-sky-700 hover:bg-sky-50"
                                    }`}
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
                </div>

                <div className="grid min-h-0 grid-cols-1 gap-3 overflow-auto">
                  <div className="rounded-2xl border border-sky-100/80 bg-gradient-to-br from-white to-sky-50/30 p-3 shadow-[0_4px_14px_rgba(14,165,233,0.08)]">
                    <div className="mb-2 text-sm font-semibold text-gray-900">Team Mix</div>
                    <div className="h-44">
                      <Doughnut
                        data={crmVsNonCrmChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } } },
                        }}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-rose-100/80 bg-gradient-to-br from-white to-rose-50/30 p-3 shadow-[0_4px_14px_rgba(244,63,94,0.08)]">
                    <div className="mb-2 text-sm font-semibold text-gray-900">Lead Status Snapshot</div>
                    <div className="h-44">
                      <Bar data={leadStatusChartData} options={compactChartOptions} />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-amber-100/80 bg-gradient-to-br from-white to-amber-50/30 p-3 shadow-[0_4px_14px_rgba(245,158,11,0.08)]">
                    <div className="mb-2 text-sm font-semibold text-gray-900">Recent Import Trend</div>
                    <div className="h-44">
                      <Line data={importTrendChartData} options={compactLineOptions} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

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

              <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)]">
                <div className="flex flex-col border-b border-rose-100 lg:border-b-0 lg:border-r">
                  {/* Import button — always visible at top */}
                  <div className="sticky top-0 z-20 border-b border-rose-100 bg-gradient-to-r from-emerald-50 to-sky-50 px-4 py-3">
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
                      className="w-full rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-[0_6px_20px_rgba(16,185,129,0.35)] transition-all hover:shadow-[0_8px_28px_rgba(16,185,129,0.45)] hover:brightness-105 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12" /></svg>
                        {importing ? "Importing..." : "Import Leads to CRM"}
                      </div>
                      {previewRows.length > 0 && !duplicateIssues.length && excelFile ? (
                        <div className="mt-1 text-xs font-medium text-emerald-100">{readyPreviewRows} leads ready to import</div>
                      ) : null}
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 lg:p-5">
                  {/* File upload — prominent drag-drop zone */}
                  <label
                    className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-all ${
                      excelFile
                        ? "border-emerald-300 bg-emerald-50/60"
                        : "border-rose-300 bg-rose-50/40 hover:border-rose-400 hover:bg-rose-50/80"
                    }`}
                  >
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={(e) => void handleExcelFileChange(e.target.files?.[0] || null)}
                      className="absolute inset-0 cursor-pointer opacity-0"
                    />
                    {excelFile ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <div className="mt-2 text-sm font-semibold text-emerald-800 truncate max-w-full">{excelFile.name}</div>
                        <div className="mt-1 text-xs text-emerald-600">Click or drop to replace file</div>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-rose-400 group-hover:text-rose-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                        <div className="mt-2 text-sm font-bold text-rose-700">Click to upload Excel file</div>
                        <div className="mt-1 text-xs text-rose-500">or drag and drop .xlsx, .xls, .csv</div>
                      </>
                    )}
                  </label>

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

                  {/* Task Start & Due Date — per-upload deadlines */}
                  <div className="mt-4 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-white px-3 py-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Upload Deadline</div>
                    <p className="mt-0.5 text-[11px] text-indigo-600/80">Set a start and due date for all leads in this upload batch.</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-gray-600">Task Start</label>
                        <input
                          type="date"
                          value={taskStartDate}
                          onChange={(e) => setTaskStartDate(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm shadow-sm focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-600">Due Date</label>
                        <input
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm shadow-sm focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

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
                  </div>
                </div>

                <div className="min-h-0 overflow-hidden p-4 lg:p-5">
                  <div className="h-full overflow-auto">
                    <div className="sticky top-0 z-10 rounded-t-2xl border border-rose-100 bg-gradient-to-r from-rose-50 to-sky-50 px-4 py-3">
                      <div className="text-sm font-semibold text-gray-900">Extracted Lead Details</div>
                      <div className="text-xs text-gray-600">
                        {previewRows.length} lead{previewRows.length !== 1 ? "s" : ""} parsed &middot; {readyPreviewRows} ready &middot; {rowCountWithDuplicates} duplicate{rowCountWithDuplicates !== 1 ? "s" : ""}
                      </div>
                    </div>

                    {previewRows.length === 0 ? (
                      <div className="rounded-b-2xl border border-t-0 border-rose-100 bg-white px-4 py-14 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <div className="mt-3 text-sm font-medium text-gray-500">Upload an Excel file to preview leads</div>
                        <div className="mt-1 text-xs text-gray-400">Supported: .xlsx, .xls, .csv</div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 pt-3 sm:grid-cols-2 xl:grid-cols-3">
                        {previewRows.map((row) => {
                          const issues = duplicateIssuesByRow.get(row.rowNumber) || [];
                          const hasIssue = issues.length > 0;
                          return (
                            <div
                              key={`${row.rowNumber}-${row.duplicateKey}`}
                              className={`group relative flex flex-col rounded-2xl border p-4 shadow-[0_2px_10px_rgba(15,23,42,0.06)] transition-all hover:shadow-[0_4px_16px_rgba(15,23,42,0.10)] ${
                                hasIssue
                                  ? "border-amber-200 bg-gradient-to-br from-amber-50/80 to-white"
                                  : "border-slate-200/80 bg-gradient-to-br from-white to-sky-50/30"
                              }`}
                            >
                              {/* Header */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-indigo-500 text-[11px] font-bold text-white shadow-sm">
                                      {(row.clientName || "?")[0].toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="truncate text-sm font-semibold text-gray-900">{row.clientName || "Unnamed"}</div>
                                      <div className="truncate text-[11px] text-gray-500">{row.title}{row.title && row.companyName ? " · " : ""}{row.companyName}</div>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-shrink-0 flex-col items-end gap-1">
                                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                    hasIssue
                                      ? "border border-amber-300 bg-amber-100 text-amber-800"
                                      : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                                  }`}>
                                    {hasIssue ? "Duplicate" : "Ready"}
                                  </span>
                                  <span className="text-[10px] text-gray-400">#{row.rowNumber}</span>
                                </div>
                              </div>

                              {/* Contact info */}
                              <div className="mt-3 space-y-1.5">
                                {row.email ? (
                                  <div className="flex items-center gap-2 text-xs">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 flex-shrink-0 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                    <span className="truncate text-gray-700">{row.email}</span>
                                  </div>
                                ) : null}
                                {row.phone ? (
                                  <div className="flex items-center gap-2 text-xs">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                    <span className="text-gray-700">{row.phone}</span>
                                  </div>
                                ) : null}
                                {row.website ? (
                                  <div className="flex items-center gap-2 text-xs">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 flex-shrink-0 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                                    <span className="truncate text-gray-700">{row.website}</span>
                                  </div>
                                ) : null}
                              </div>

                              {/* Tags row */}
                              <div className="mt-3 flex flex-wrap gap-1.5">
                                {row.location ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-violet-100 bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    {row.location}
                                  </span>
                                ) : null}
                                {row.industry ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                    {row.industry}
                                  </span>
                                ) : null}
                                {row.socials ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-pink-100 bg-pink-50 px-2 py-0.5 text-[10px] font-medium text-pink-700">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                    {row.socials}
                                  </span>
                                ) : null}
                                {row.lists.length > 0 ? row.lists.map((list, li) => (
                                  <span key={li} className="inline-flex rounded-full border border-sky-100 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700">
                                    {list}
                                  </span>
                                )) : null}
                              </div>

                              {/* Notes */}
                              {row.notes ? (
                                <div className="mt-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] leading-4 text-gray-600">
                                  {row.notes}
                                </div>
                              ) : null}

                              {/* Duplicate warnings */}
                              {hasIssue ? (
                                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5">
                                  {issues.map((reason, idx) => (
                                    <div key={`${row.rowNumber}-${idx}`} className="text-[11px] text-amber-800">
                                      ⚠ {reason}
                                    </div>
                                  ))}
                                </div>
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

        {showLeadDetailsModal ? (
          <div className="fixed inset-0 z-[96] p-3 md:p-6">
            <div
              className="absolute inset-0 bg-slate-900/55 backdrop-blur-[1px]"
              onClick={closeLeadDetailsModal}
            />

            <div className="relative mx-auto flex h-[92vh] max-w-4xl flex-col overflow-hidden rounded-3xl border border-sky-200 bg-gradient-to-br from-white via-sky-50/40 to-rose-50 shadow-2xl">
              <div className="flex items-start justify-between border-b border-sky-100 px-5 py-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Lead Conversation & Files</h3>
                  <p className="text-sm text-gray-600">
                    Review CRM history, play recordings, and reply back to the assigned rep.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeLeadDetailsModal}
                  disabled={submittingAdminReply}
                  className="rounded-xl border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  Close
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
                {leadDetailsLoadingId ? (
                  <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                    Loading lead details...
                  </div>
                ) : leadDetailsError ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {leadDetailsError}
                  </div>
                ) : !activeLeadDetails ? (
                  <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
                    Lead details are unavailable.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-sky-100 bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-lg font-semibold text-gray-900">{activeLeadDetails.clientName}</div>
                          <div className="text-xs text-gray-600">
                            {activeLeadDetails.companyName || "No company"} • {activeLeadDetails.email || "No email"}
                          </div>
                        </div>
                        <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                          {statusLabel(activeLeadDetails.status)}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-gray-700 md:grid-cols-2">
                        <div><span className="font-medium">Phone:</span> {activeLeadDetails.phoneFormatted || activeLeadDetails.phoneRaw || "-"}</div>
                        <div><span className="font-medium">Due:</span> {toIsoDateValue(activeLeadDetails.dueDate) || "-"}</div>
                        <div><span className="font-medium">Lists:</span> {activeLeadDetails.listItems?.join(", ") || "-"}</div>
                        <div><span className="font-medium">Updated:</span> {toDateTimeValue(activeLeadDetails.updatedAt)}</div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-rose-100 bg-white p-4">
                      <div className="text-sm font-semibold text-gray-900">Reply to CRM agent</div>
                      <p className="mt-1 text-xs text-gray-600">
                        Add a clear instruction or feedback. It appears in the mobile CRM task activity timeline.
                      </p>

                      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-[200px_minmax(0,1fr)]">
                        <select
                          value={adminReplyStatus}
                          onChange={(e) => setAdminReplyStatus(e.target.value)}
                          className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
                        >
                          {CRM_STATUSES.map((status) => (
                            <option key={status} value={status}>{statusLabel(status)}</option>
                          ))}
                        </select>
                        <textarea
                          value={adminReply}
                          onChange={(e) => setAdminReply(e.target.value)}
                          rows={3}
                          placeholder="Add admin reply visible to CRM rep..."
                          className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>

                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => void submitAdminLeadReply()}
                          disabled={submittingAdminReply || !adminReply.trim()}
                          className="inline-flex items-center rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
                        >
                          {submittingAdminReply ? "Sending..." : "Send Reply"}
                        </button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-sky-100 bg-white p-4">
                      <div className="text-sm font-semibold text-gray-900">Activity Timeline</div>
                      <p className="mt-1 text-xs text-gray-600">
                        Every comment, attachment, and voice note shared between admin and CRM rep.
                      </p>

                      {activeLeadUpdates.length === 0 ? (
                        <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                          No updates yet on this lead.
                        </div>
                      ) : (
                        <div className="mt-3 space-y-3">
                          {activeLeadUpdates.map((update, idx) => {
                            const updateId = normalizeUpdateId(update._id);
                            return (
                              <div key={updateId || `${idx}-${update.createdAt || "na"}`} className="rounded-xl border border-sky-100 bg-sky-50/40 px-3 py-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="text-xs font-medium text-sky-800">{leadUpdateAuthorLabel(update)}</div>
                                <div className="text-[11px] text-gray-500">{toDateTimeValue(update.createdAt)}</div>
                              </div>
                              <div className="mt-1 text-[11px] text-gray-500">Status: {statusLabel(update.status || activeLeadDetails.status)}</div>

                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                {update.editedAt && !update.isDeleted ? (
                                  <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                                    Edited
                                  </span>
                                ) : null}
                                {update.isDeleted ? (
                                  <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                                    Deleted
                                  </span>
                                ) : null}
                              </div>

                              {update.isDeleted ? (
                                <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-sm italic text-red-700">
                                  This update was deleted.
                                </div>
                              ) : null}

                              {!update.isDeleted && editingUpdateId === updateId ? (
                                <div className="mt-2 space-y-2 rounded-lg border border-sky-200 bg-white px-2.5 py-2">
                                  <textarea
                                    value={editingComment}
                                    onChange={(e) => setEditingComment(e.target.value)}
                                    rows={3}
                                    placeholder="Edit update message"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                  />

                                  <select
                                    value={editingStatus}
                                    onChange={(e) => setEditingStatus(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                  >
                                    {CRM_STATUSES.map((status) => (
                                      <option key={`${updateId}-${status}`} value={status}>
                                        {statusLabel(status)}
                                      </option>
                                    ))}
                                  </select>

                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={cancelEditLeadUpdate}
                                      disabled={timelineBusyKey === `edit:${updateId}`}
                                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-60"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void saveEditedLeadUpdate(update)}
                                      disabled={timelineBusyKey === `edit:${updateId}`}
                                      className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
                                    >
                                      {timelineBusyKey === `edit:${updateId}` ? "Saving..." : "Save"}
                                    </button>
                                  </div>
                                </div>
                              ) : null}

                              {!update.isDeleted && update.comment ? (
                                <div className="mt-2 rounded-lg border border-white/80 bg-white px-2.5 py-2 text-sm text-gray-800">
                                  {update.comment}
                                </div>
                              ) : null}

                              {!update.isDeleted && editingUpdateId !== updateId ? (
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => beginEditLeadUpdate(update)}
                                    disabled={Boolean(timelineBusyKey) || !updateId}
                                    className="rounded-lg border border-sky-300 bg-white px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-50 disabled:opacity-60"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void deleteLeadUpdate(update)}
                                    disabled={timelineBusyKey === `delete:${updateId}` || !updateId}
                                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                                  >
                                    {timelineBusyKey === `delete:${updateId}` ? "Deleting..." : "Delete"}
                                  </button>
                                </div>
                              ) : null}

                              {!update.isDeleted && update.attachmentUrls?.length ? (
                                <div className="mt-2 space-y-1">
                                  <div className="text-xs font-medium text-gray-700">Attachments</div>
                                  <div className="flex flex-wrap gap-2">
                                    {update.attachmentUrls.map((url, fileIdx) => (
                                      <div key={`${url}-${fileIdx}`} className="rounded-lg border border-sky-100 bg-white p-2">
                                        {isLikelyImageUrl(url) ? (
                                          <a href={url} target="_blank" rel="noreferrer" className="block">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                              src={url}
                                              alt={`Attachment ${fileIdx + 1}`}
                                              className="h-28 w-44 max-w-full rounded-md border border-sky-100 object-cover"
                                            />
                                          </a>
                                        ) : (
                                          <a
                                            href={url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center rounded-full border border-sky-200 bg-white px-2.5 py-1 text-xs text-sky-700 hover:bg-sky-50"
                                          >
                                            File {fileIdx + 1}
                                          </a>
                                        )}
                                        <div className="mt-2">
                                          <button
                                            type="button"
                                            onClick={() => void deleteLeadUpdateAttachment(update, url)}
                                            disabled={timelineBusyKey === `attachment:${updateId}:${url}` || !updateId}
                                            className="rounded-md bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                                          >
                                            {timelineBusyKey === `attachment:${updateId}:${url}` ? "Removing..." : "Remove"}
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : null}

                              {!update.isDeleted && update.recordingUrl ? (
                                <div className="mt-2">
                                  <div className="mb-1 text-xs font-medium text-gray-700">Voice Recording</div>
                                  <audio controls src={update.recordingUrl} className="w-full" preload="none" />
                                  <button
                                    type="button"
                                    onClick={() => void deleteLeadUpdateRecording(update)}
                                    disabled={timelineBusyKey === `recording:${updateId}` || !updateId}
                                    className="mt-2 rounded-md bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                                  >
                                    {timelineBusyKey === `recording:${updateId}` ? "Deleting..." : "Delete audio"}
                                  </button>
                                </div>
                              ) : null}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
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
