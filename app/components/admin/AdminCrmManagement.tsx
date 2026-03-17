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
import AttachFileRoundedIcon from "@mui/icons-material/AttachFileRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import MicRoundedIcon from "@mui/icons-material/MicRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);

type CrmUserItem = {
  _id: string;
  email: string;
  username?: string;
  companyName?: string;
  contactPhone?: string;
  crmAddress?: string;
  crmQuadrant?: string;
  crmSpecializations?: string[];
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

type AssignmentByUploadSummary = {
  sourceBatchId: string;
  sourceFileName?: string;
  importedAt: string;
  leadCount: number;
  overdueCount: number;
  agents: Array<{
    agentId: string;
    agentEmail?: string;
    agentUsername?: string;
    leadCount: number;
  }>;
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

const CRM_SPECIALIZATION_LABELS: Record<string, string> = {
  industrial_construction: "Industrial & Construction",
  farm_equipment_sales: "Farm & Farm Equipment Sales",
  others: "Others",
};

function formatCrmSpecializations(values?: string[]): string {
  if (!Array.isArray(values) || values.length === 0) return "";
  return values
    .map((value) => CRM_SPECIALIZATION_LABELS[value] || value)
    .filter(Boolean)
    .join(", ");
}

function parseCrmQuadrants(value?: string): string[] {
  return String(value || "")
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
}

function formatCrmQuadrants(value?: string): string {
  const quadrants = parseCrmQuadrants(value);
  return quadrants.join(", ");
}

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
  if (value === "completed") return "Archived";
  if (value === "archived") return "Archived";
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
  const crmTheme = useTheme();
  const matchesMd = useMediaQuery(crmTheme.breakpoints.up("md"));
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
  const [leadMonths, setLeadMonths] = useState<string[]>([]);
  const [leadYear, setLeadYear] = useState<string>("");
  const [leadFromDate, setLeadFromDate] = useState("");
  const [leadToDate, setLeadToDate] = useState("");
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
    if (leadFromDate || leadToDate) {
      return { from: leadFromDate, to: leadToDate };
    }

    const year = Number.parseInt(leadYear, 10);
    if (!Number.isFinite(year) || year < 1970 || year > 9999 || leadMonths.length > 0) {
      return { from: "", to: "" };
    }

    return {
      from: `${year}-01-01`,
      to: `${year}-12-31`,
    };
  }, [leadFromDate, leadMonths.length, leadToDate, leadYear]);

  const leadQuery = useMemo(() => {
    const p = new URLSearchParams();
    if (leadQ.trim()) p.set("q", leadQ.trim());
    if (leadStatus) p.set("status", leadStatus);
    if (leadAssignedTo) p.set("assignedTo", leadAssignedTo);
    if (!leadFromDate && !leadToDate && leadMonths.length > 0 && leadYear) {
      p.set("months", leadMonths.join(","));
      p.set("year", leadYear);
    }
    if (leadDateRange.from) p.set("from", leadDateRange.from);
    if (leadDateRange.to) p.set("to", leadDateRange.to);
    p.set("page", "1");
    p.set("limit", "100");
    return p.toString();
  }, [leadAssignedTo, leadDateRange.from, leadDateRange.to, leadFromDate, leadMonths, leadQ, leadStatus, leadToDate, leadYear]);

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

    try {
      setImporting(true);
      const formData = new FormData();
      formData.append("file", excelFile);
      formData.append("duplicateMode", "skip");
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

      const dupCount = json?.duplicateCount || 0;
      const msg = dupCount > 0
        ? `Imported ${json?.imported || 0} CRM leads (${dupCount} duplicate${dupCount === 1 ? "" : "s"} skipped)`
        : `Imported ${json?.imported || 0} CRM leads`;
      pushToast(msg, "success");
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
          backgroundColor: ["#64748B", "#0EA5E9", "#16A34A", "#F59E0B", "#EF4444", "#4F46E5"],
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

  const assignmentUploadRows = useMemo<AssignmentByUploadSummary[]>(() => {
    const grouped = new Map<string, AssignmentByUploadSummary>();

    for (const row of assignmentsByUpload) {
      const existing = grouped.get(row.sourceBatchId);
      if (existing) {
        existing.leadCount += row.leadCount || 0;
        existing.overdueCount += row.overdueCount || 0;
        existing.agents.push({
          agentId: row.agentId,
          agentEmail: row.agentEmail,
          agentUsername: row.agentUsername,
          leadCount: row.leadCount || 0,
        });
        continue;
      }

      grouped.set(row.sourceBatchId, {
        sourceBatchId: row.sourceBatchId,
        sourceFileName: row.sourceFileName,
        importedAt: row.importedAt,
        leadCount: row.leadCount || 0,
        overdueCount: row.overdueCount || 0,
        agents: [
          {
            agentId: row.agentId,
            agentEmail: row.agentEmail,
            agentUsername: row.agentUsername,
            leadCount: row.leadCount || 0,
          },
        ],
      });
    }

    return Array.from(grouped.values()).sort((a, b) => {
      const aTime = new Date(a.importedAt || "").getTime() || 0;
      const bTime = new Date(b.importedAt || "").getTime() || 0;
      return bTime - aTime;
    });
  }, [assignmentsByUpload]);

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
          "rgba(79,70,229,0.8)",
        ],
        borderColor: ["#64748B", "#0EA5E9", "#16A34A", "#F59E0B", "#EF4444", "#4F46E5"],
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
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: "auto" }}>
      <Stack spacing={3}>
        {/* ── Header + Filters + Stats ── */}
        <Card>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Stack spacing={2.5}>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "flex-start", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="h5" fontWeight={800}>CRM Control Center</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Assign CRM roles, import lead sheets, and monitor task activity.
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<GroupsRoundedIcon />}
                  onClick={() => setShowCrmOpsModal(true)}
                >
                  Team Ops
                </Button>
              </Box>

              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Salesperson</InputLabel>
                    <Select value={leadAssignedTo} label="Salesperson" onChange={(e) => setLeadAssignedTo(e.target.value)}>
                      <MenuItem value="">All CRM Agents</MenuItem>
                      {crmAgentUsers.map((u) => (
                        <MenuItem key={u._id} value={u._id}>{u.username || u.email}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Months</InputLabel>
                    <Select
                      multiple
                      value={leadMonths}
                      label="Months"
                      onChange={(e) => setLeadMonths(typeof e.target.value === "string" ? e.target.value.split(",") : e.target.value)}
                      renderValue={(selected) => {
                        const values = Array.isArray(selected) ? selected : [];
                        if (!values.length) return "All Months";
                        return values
                          .map((value) => MONTH_OPTIONS.find((m) => m.value === value)?.label || value)
                          .join(", ");
                      }}
                    >
                      {MONTH_OPTIONS.map((m) => (
                        <MenuItem key={m.value} value={m.value}>
                          <Checkbox size="small" checked={leadMonths.includes(m.value)} />
                          <Typography variant="body2">{m.label}</Typography>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Year</InputLabel>
                    <Select value={leadYear} label="Year" onChange={(e) => setLeadYear(e.target.value)}>
                      <MenuItem value="">All</MenuItem>
                      {yearOptions.map((year) => (
                        <MenuItem key={year} value={String(year)}>{year}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="From Date"
                    value={leadFromDate}
                    onChange={(e) => setLeadFromDate(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="To Date"
                    value={leadToDate}
                    onChange={(e) => setLeadToDate(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Grid>
              </Grid>

              <Grid container spacing={1.5}>
                {([
                  { label: "CRM Agents", value: crmUsersCount, color: "primary.main" },
                  { label: "Total Leads", value: leads?.total || 0, color: "info.main" },
                  { label: "Total Users", value: totalUsersCount, color: "text.primary" },
                  { label: "Overdue", value: overdueLeadsCount, color: "error.main" },
                ] as const).map((stat) => (
                  <Grid key={stat.label} size={{ xs: 6, sm: 3 }}>
                    <Card variant="outlined" sx={{ textAlign: "center", py: 1.5 }}>
                      <Typography variant="overline" color="text.secondary" sx={{ fontSize: "0.65rem" }}>
                        {stat.label}
                      </Typography>
                      <Typography variant="h5" fontWeight={800} color={stat.color}>
                        {stat.value}
                      </Typography>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Stack>
          </CardContent>
        </Card>

        {/* ── Charts ── */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={700}>Lead Status Distribution</Typography>
                <Typography variant="caption" color="text.secondary">Breakdown of all leads by current status.</Typography>
                <Box sx={{ height: 220, mt: 1.5 }}>
                  <Pie
                    data={leadStatusPieData}
                    options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "right", labels: { boxWidth: 10, font: { size: 11 }, padding: 8 } } } }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={700}>Leads per Agent</Typography>
                <Typography variant="caption" color="text.secondary">Top assigned CRM agents by lead count.</Typography>
                <Box sx={{ height: 220, mt: 1.5 }}>
                  <Bar data={leadsPerAgentData} options={compactChartOptions} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* ── Import Leads ── */}
        <Card>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={2}>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>Import Leads (Excel)</Typography>
                <Typography variant="body2" color="text.secondary">
                  Upload Excel, preview extracted rows, and block duplicates before import.
                </Typography>
              </Box>
              <Button variant="contained" startIcon={<CloudUploadRoundedIcon />} onClick={() => setShowImportModal(true)}>
                Upload Preview
              </Button>
            </Stack>
            {excelFile && (
              <Chip
                icon={<AttachFileRoundedIcon sx={{ fontSize: 16 }} />}
                label={excelFile.name}
                color="info"
                variant="outlined"
                size="small"
                sx={{ mt: 1.5 }}
              />
            )}
          </CardContent>
        </Card>

        {/* ── Lead Activity Table ── */}
        <Card>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "flex-end" }} spacing={2}>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>Lead Activity</Typography>
                <Typography variant="body2" color="text.secondary">Latest CRM tasks across all assigned agents.</Typography>
              </Box>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ width: "100%", maxWidth: { md: 500 } }}>
                <TextField
                  size="small"
                  placeholder="Search lead, email, phone"
                  value={leadQ}
                  onChange={(e) => setLeadQ(e.target.value)}
                  slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18 }} /></InputAdornment> } }}
                  fullWidth
                />
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>Status</InputLabel>
                  <Select value={leadStatus} label="Status" onChange={(e) => setLeadStatus(e.target.value)}>
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="archived">Archived</MenuItem>
                    {CRM_STATUSES.filter((s) => s !== "completed").map((s) => <MenuItem key={s} value={s}>{statusLabel(s)}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>Agent</InputLabel>
                  <Select value={leadAssignedTo} label="Agent" onChange={(e) => setLeadAssignedTo(e.target.value)}>
                    <MenuItem value="">All</MenuItem>
                    {crmAgentUsers.map((u) => <MenuItem key={u._id} value={u._id}>{u.username || u.email}</MenuItem>)}
                  </Select>
                </FormControl>
              </Stack>
            </Stack>

            {leadAssignedTo && (
              <Chip
                label={`Filtered: ${crmAgentUsers.find((u) => u._id === leadAssignedTo)?.username || crmAgentUsers.find((u) => u._id === leadAssignedTo)?.email || "Agent"}`}
                color="info"
                variant="outlined"
                size="small"
                sx={{ mt: 1.5 }}
              />
            )}

            {loadingLeads && <LinearProgress sx={{ mt: 2, borderRadius: 1 }} />}

            <TableContainer sx={{ maxHeight: 420, mt: 2 }}>
              <Table size="small" stickyHeader sx={{ tableLayout: "fixed", minWidth: 760 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Lead</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Assigned To</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Dates</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 240 }}>Latest Comment</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 130 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {!loadingLeads && (leads?.items || []).length === 0 && (
                    <TableRow><TableCell colSpan={6} sx={{ color: "text.secondary", py: 4, textAlign: "center" }}>No CRM leads found</TableCell></TableRow>
                  )}
                  {(leads?.items || []).map((lead) => (
                    <TableRow key={lead._id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{lead.clientName}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {lead.email || "-"} {lead.phoneFormatted || lead.phoneRaw ? `· ${lead.phoneFormatted || lead.phoneRaw}` : ""}
                        </Typography>
                        {(lead.companyLocation || lead.industry) && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            {[lead.companyLocation, lead.industry].filter(Boolean).join(" · ")}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{(lead.assignedTo?.username || lead.assignedTo?.email || "-") as string}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={statusLabel(lead.status)} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" display="block">Start: {toIsoDateValue(lead.taskStartDate) || "-"}</Typography>
                        <Typography variant="caption" display="block">Due: {toIsoDateValue(lead.dueDate) || "-"}</Typography>
                      </TableCell>
                      <TableCell sx={{ width: 240 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            display: "block",
                            width: "100%",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {lead.latestComment || "-"}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ width: 130 }}>
                        <Stack direction="row" spacing={0.5}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<VisibilityRoundedIcon sx={{ fontSize: 16 }} />}
                            onClick={() => void openLeadDetailsModal(lead._id)}
                            disabled={leadDetailsLoadingId === lead._id}
                          >
                            {leadDetailsLoadingId === lead._id ? "…" : "View"}
                          </Button>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => void deleteLead(lead)}
                            disabled={deletingLeadId === lead._id}
                          >
                            <DeleteRoundedIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* ── Uploaded Excel Files ── */}
        <Card>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={2}>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>Uploaded Excel Files</Typography>
                <Typography variant="body2" color="text.secondary">Delete a file to remove every CRM lead imported from that batch.</Typography>
              </Box>
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshRoundedIcon />}
                onClick={() => void loadImportFiles()}
                disabled={loadingImportFiles || deletingBatchId !== null}
              >
                {loadingImportFiles ? "Refreshing…" : "Refresh"}
              </Button>
            </Stack>
            <TableContainer sx={{ maxHeight: 360, mt: 2 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>File</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Imported</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Leads</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingImportFiles ? (
                    <TableRow><TableCell colSpan={4}><LinearProgress /></TableCell></TableRow>
                  ) : (importFiles?.items || []).length === 0 ? (
                    <TableRow><TableCell colSpan={4} sx={{ color: "text.secondary", py: 3, textAlign: "center" }}>No imported files</TableCell></TableRow>
                  ) : (importFiles?.items || []).map((item) => (
                    <TableRow key={item.sourceBatchId} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 300 }}>{item.sourceFileName || "Unnamed"}</Typography>
                        <Typography variant="caption" color="text.secondary">Batch: {item.sourceBatchId}</Typography>
                        {item.sourceFileUrl && (
                          <Button size="small" href={item.sourceFileUrl} target="_blank" rel="noreferrer" startIcon={<OpenInNewRoundedIcon sx={{ fontSize: 14 }} />} sx={{ fontSize: "0.7rem", p: 0, minWidth: 0, mt: 0.5 }}>R2</Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" display="block">{toIsoDateValue(item.importedAt) || "-"}</Typography>
                        <Typography variant="caption" display="block" color="text.secondary">Latest: {toIsoDateValue(item.latestLeadAt) || "-"}</Typography>
                      </TableCell>
                      <TableCell><Chip label={item.leadCount} size="small" color="info" variant="outlined" /></TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          startIcon={<DeleteRoundedIcon sx={{ fontSize: 16 }} />}
                          onClick={() => void deleteImportedFile(item)}
                          disabled={deletingBatchId === item.sourceBatchId}
                        >
                          {deletingBatchId === item.sourceBatchId ? "…" : "Delete"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* ── Lead Assignment by Upload ── */}
        <Card>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={2}>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>Lead Assignment by Upload</Typography>
                <Typography variant="body2" color="text.secondary">See how many leads each upload created and which agents received them.</Typography>
              </Box>
              <Button variant="outlined" size="small" startIcon={<RefreshRoundedIcon />} onClick={() => void loadAssignmentsByUpload()} disabled={loadingAssignments}>
                {loadingAssignments ? "Refreshing…" : "Refresh"}
              </Button>
            </Stack>
            <TableContainer sx={{ maxHeight: 420, mt: 2 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Upload File</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Imported</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Leads</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Agents</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingAssignments ? (
                    <TableRow><TableCell colSpan={4}><LinearProgress /></TableCell></TableRow>
                  ) : assignmentUploadRows.length === 0 ? (
                    <TableRow><TableCell colSpan={4} sx={{ color: "text.secondary", py: 3, textAlign: "center" }}>No assignment data</TableCell></TableRow>
                  ) : assignmentUploadRows.map((row) => (
                    <TableRow key={row.sourceBatchId} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 220 }}>{row.sourceFileName || "Unnamed"}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 220 }}>{row.sourceBatchId}</Typography>
                      </TableCell>
                      <TableCell><Typography variant="caption">{row.importedAt ? new Date(row.importedAt).toLocaleDateString() : "-"}</Typography></TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Chip label={row.leadCount} size="small" color="info" variant="outlined" />
                          {row.overdueCount > 0 && <Chip label={`${row.overdueCount} overdue`} size="small" color="error" variant="outlined" />}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                          {row.agents.map((agent) => (
                            <Chip
                              key={`${row.sourceBatchId}-${agent.agentId}`}
                              label={`${agent.agentUsername || agent.agentEmail || "?"} (${agent.leadCount})`}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* ── CRM Team Manager Dialog ── */}
        <Dialog open={showCrmOpsModal} onClose={() => setShowCrmOpsModal(false)} maxWidth="xl" fullWidth fullScreen={!matchesMd} scroll="paper">
          <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
            <Box>
              <Typography variant="h6" fontWeight={800}>CRM Team Manager</Typography>
              <Typography variant="body2" color="text.secondary">Assign/remove CRM roles and monitor team distribution.</Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" startIcon={<RefreshRoundedIcon />} onClick={() => void loadUsers()} disabled={loadingUsers}>
                {loadingUsers ? "…" : "Refresh"}
              </Button>
              <IconButton size="small" onClick={() => setShowCrmOpsModal(false)}><CloseRoundedIcon /></IconButton>
            </Stack>
          </DialogTitle>
          <DialogContent dividers sx={{ p: 0 }}>
            <Grid container sx={{ minHeight: 500 }}>
              <Grid size={{ xs: 12, lg: 7 }} sx={{ p: 2, borderRight: { lg: "1px solid" }, borderColor: { lg: "divider" } }}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} mb={2}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Email, username, company"
                    value={userQ}
                    onChange={(e) => setUserQ(e.target.value)}
                    slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18 }} /></InputAdornment> } }}
                  />
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>CRM Filter</InputLabel>
                    <Select value={crmFilter} label="CRM Filter" onChange={(e) => setCrmFilter(e.target.value as "all" | "crm" | "noncrm")}>
                      <MenuItem value="all">All users</MenuItem>
                      <MenuItem value="crm">CRM only</MenuItem>
                      <MenuItem value="noncrm">Non-CRM only</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>

                <Grid container spacing={1} mb={2}>
                  {([
                    { label: "Agents", value: crmUsersCount, color: "primary.main" },
                    { label: "Total", value: totalUsersCount, color: "text.primary" },
                    { label: "Selected", value: selectedUserIds.length, color: "success.main" },
                  ] as const).map((s) => (
                    <Grid key={s.label} size={{ xs: 4 }}>
                      <Card variant="outlined" sx={{ textAlign: "center", py: 1 }}>
                        <Typography variant="overline" sx={{ fontSize: "0.6rem" }}>{s.label}</Typography>
                        <Typography variant="h6" fontWeight={800} color={s.color}>{s.value}</Typography>
                      </Card>
                    </Grid>
                  ))}
                </Grid>

                {loadingUsers && <LinearProgress sx={{ mb: 1 }} />}

                <TableContainer sx={{ maxHeight: 380 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox" />
                        <TableCell sx={{ fontWeight: 700 }}>User</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>CRM Role</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(users?.items || []).length === 0 && !loadingUsers && (
                        <TableRow><TableCell colSpan={4} sx={{ textAlign: "center", py: 3, color: "text.secondary" }}>No users found</TableCell></TableRow>
                      )}
                      {(users?.items || []).map((u) => (
                        <TableRow key={u._id} hover>
                          <TableCell padding="checkbox">
                            <Checkbox
                              size="small"
                              checked={selectedUserIds.includes(u._id)}
                              disabled={!u.isCrmAgent}
                              onChange={(e) => toggleSelectedUser(u._id, e.target.checked)}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>{u.email}</Typography>
                            <Typography variant="caption" color="text.secondary">{u.username || "-"} {u.companyName ? `· ${u.companyName}` : ""}</Typography>
                            {(u.crmQuadrant || formatCrmSpecializations(u.crmSpecializations)) ? (
                              <Typography variant="caption" display="block" color="info.main">
                                {[formatCrmQuadrants(u.crmQuadrant) ? `Quadrant ${formatCrmQuadrants(u.crmQuadrant)}` : "", formatCrmSpecializations(u.crmSpecializations)].filter(Boolean).join(" · ")}
                              </Typography>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={u.isCrmAgent ? "CRM Agent" : "Not Assigned"}
                              size="small"
                              color={u.isCrmAgent ? "success" : "default"}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              variant="outlined"
                              color={u.isCrmAgent ? "error" : "primary"}
                              onClick={() => toggleCrmAgent(u)}
                              disabled={updatingUserId === u._id || Boolean(u.isBlocked)}
                            >
                              {u.isCrmAgent ? "Remove" : "Assign"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              <Grid size={{ xs: 12, lg: 5 }} sx={{ p: 2, overflow: "auto" }}>
                <Stack spacing={2}>
                  <Card variant="outlined">
                    <CardContent sx={{ py: 1.5 }}>
                      <Typography variant="subtitle2" fontWeight={700} gutterBottom>Team Mix</Typography>
                      <Box sx={{ height: 180 }}>
                        <Doughnut data={crmVsNonCrmChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } } } }} />
                      </Box>
                    </CardContent>
                  </Card>
                  <Card variant="outlined">
                    <CardContent sx={{ py: 1.5 }}>
                      <Typography variant="subtitle2" fontWeight={700} gutterBottom>Lead Status Snapshot</Typography>
                      <Box sx={{ height: 180 }}><Bar data={leadStatusChartData} options={compactChartOptions} /></Box>
                    </CardContent>
                  </Card>
                  <Card variant="outlined">
                    <CardContent sx={{ py: 1.5 }}>
                      <Typography variant="subtitle2" fontWeight={700} gutterBottom>Recent Import Trend</Typography>
                      <Box sx={{ height: 180 }}><Line data={importTrendChartData} options={compactLineOptions} /></Box>
                    </CardContent>
                  </Card>
                </Stack>
              </Grid>
            </Grid>
          </DialogContent>
        </Dialog>

        {/* ── Import Preview Dialog ── */}
        <Dialog open={showImportModal} onClose={() => !importing && setShowImportModal(false)} maxWidth="xl" fullWidth fullScreen={!matchesMd} scroll="paper">
          <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
            <Box>
              <Typography variant="h6" fontWeight={800}>CRM Excel Upload Preview</Typography>
              <Typography variant="body2" color="text.secondary">Extracted rows shown below. Duplicates are blocked before upload.</Typography>
            </Box>
            <IconButton size="small" disabled={importing} onClick={() => setShowImportModal(false)}><CloseRoundedIcon /></IconButton>
          </DialogTitle>
          <DialogContent dividers sx={{ p: 0 }}>
            <Grid container sx={{ minHeight: 500 }}>
              {/* Left sidebar */}
              <Grid size={{ xs: 12, lg: 4 }} sx={{ borderRight: { lg: "1px solid" }, borderColor: { lg: "divider" }, display: "flex", flexDirection: "column" }}>
                <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="success"
                    size="large"
                    startIcon={<CloudUploadRoundedIcon />}
                    onClick={() => void onImportLeads()}
                    disabled={importing || parsingPreview || !excelFile || previewRows.length === 0}
                  >
                    {importing ? "Importing…" : "Import Leads to CRM"}
                  </Button>
                  {previewRows.length > 0 && !duplicateIssues.length && excelFile && (
                    <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: "block", textAlign: "center" }}>
                      {readyPreviewRows} leads ready to import
                    </Typography>
                  )}
                </Box>

                <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
                  {/* File upload zone */}
                  <Button
                    component="label"
                    variant="outlined"
                    fullWidth
                    color={excelFile ? "success" : "primary"}
                    startIcon={excelFile ? <CheckCircleRoundedIcon /> : <CloudUploadRoundedIcon />}
                    sx={{ py: 3, border: "2px dashed", borderColor: excelFile ? "success.main" : "divider" }}
                  >
                    {excelFile ? excelFile.name : "Click to upload .xlsx, .xls, .csv"}
                    <input type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => void handleExcelFileChange(e.target.files?.[0] || null)} />
                  </Button>

                  {excelFile && !importing && (
                    <Button fullWidth variant="outlined" color="error" size="small" sx={{ mt: 1.5 }} onClick={() => { setExcelFile(null); setPreviewRows([]); setDuplicateIssues([]); setPreviewParseError(""); setPreviewSheetName(""); }}>
                      Cancel Upload
                    </Button>
                  )}

                  {parsingPreview && <LinearProgress sx={{ mt: 2 }} />}
                  {previewParseError && <Alert severity="error" sx={{ mt: 2 }}>{previewParseError}</Alert>}

                  {/* Deadlines */}
                  <Card variant="outlined" sx={{ mt: 2 }}>
                    <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                      <Typography variant="overline" color="text.secondary" sx={{ fontSize: "0.6rem" }}>Upload Deadline</Typography>
                      <Stack direction="row" spacing={1} mt={1}>
                        <TextField size="small" type="date" label="Task Start" value={taskStartDate} onChange={(e) => setTaskStartDate(e.target.value)} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
                        <TextField size="small" type="date" label="Due Date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
                      </Stack>
                    </CardContent>
                  </Card>

                  {/* Stats */}
                  <Grid container spacing={1} sx={{ mt: 1.5 }}>
                    {([
                      { label: "Sheet", value: previewSheetName || "-" },
                      { label: "Rows", value: previewRows.length },
                      { label: "Ready", value: readyPreviewRows },
                      { label: "Duplicates", value: rowCountWithDuplicates },
                    ] as const).map((s) => (
                      <Grid key={s.label} size={{ xs: 6 }}>
                        <Card variant="outlined" sx={{ textAlign: "center", py: 0.75 }}>
                          <Typography variant="overline" sx={{ fontSize: "0.55rem" }}>{s.label}</Typography>
                          <Typography variant="subtitle2" fontWeight={700} noWrap>{s.value}</Typography>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>

                  {/* Assigned agents */}
                  <Card variant="outlined" sx={{ mt: 2 }}>
                    <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                      <Typography variant="caption" color="text.secondary">Assigned CRM reps for import</Typography>
                      <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.5} sx={{ mt: 1 }}>
                        {selectedAssignees.length > 0 ? selectedAssignees.map((agent) => (
                          <Chip key={agent._id} label={`${agent.username || agent.email}${formatCrmQuadrants(agent.crmQuadrant) ? ` · Q${formatCrmQuadrants(agent.crmQuadrant)}` : ""}`} size="small" variant="outlined" />
                        )) : (
                          <Typography variant="caption" color="text.secondary">Auto-distribute among all active CRM agents</Typography>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>

                  {duplicateIssues.length > 0 && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                      <Typography variant="subtitle2">Duplicate entries detected</Typography>
                      <Typography variant="caption">Remove duplicates from file before importing.</Typography>
                      <Box component="ul" sx={{ mt: 1, pl: 2, maxHeight: 120, overflow: "auto" }}>
                        {duplicateIssues.slice(0, 12).map((issue, idx) => (
                          <Typography component="li" variant="caption" key={`${issue.rowNumber}-${idx}`}>Row {issue.rowNumber}: {issue.reason}</Typography>
                        ))}
                        {duplicateIssues.length > 12 && <Typography component="li" variant="caption">+{duplicateIssues.length - 12} more</Typography>}
                      </Box>
                    </Alert>
                  )}
                </Box>
              </Grid>

              {/* Right — preview cards */}
              <Grid size={{ xs: 12, lg: 8 }} sx={{ overflow: "auto", p: 2 }}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700}>Extracted Lead Details</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {previewRows.length} lead{previewRows.length !== 1 ? "s" : ""} parsed · {readyPreviewRows} ready · {rowCountWithDuplicates} duplicate{rowCountWithDuplicates !== 1 ? "s" : ""}
                  </Typography>
                </Box>

                {previewRows.length === 0 ? (
                  <Box sx={{ textAlign: "center", py: 8, color: "text.secondary" }}>
                    <CloudUploadRoundedIcon sx={{ fontSize: 48, opacity: 0.3 }} />
                    <Typography variant="body2" sx={{ mt: 1.5 }}>Upload an Excel file to preview leads</Typography>
                    <Typography variant="caption">Supported: .xlsx, .xls, .csv</Typography>
                  </Box>
                ) : (
                  <Grid container spacing={1.5}>
                    {previewRows.map((row) => {
                      const issues = duplicateIssuesByRow.get(row.rowNumber) || [];
                      const hasIssue = issues.length > 0;
                      return (
                        <Grid key={`${row.rowNumber}-${row.duplicateKey}`} size={{ xs: 12, sm: 6, xl: 4 }}>
                          <Card variant="outlined" sx={{ borderColor: hasIssue ? "warning.main" : "divider" }}>
                            <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                  <Typography variant="body2" fontWeight={700} noWrap>{row.clientName || "Unnamed"}</Typography>
                                  <Typography variant="caption" color="text.secondary" noWrap>{row.title}{row.title && row.companyName ? " · " : ""}{row.companyName}</Typography>
                                </Box>
                                <Stack alignItems="flex-end" spacing={0.25}>
                                  <Chip label={hasIssue ? "Duplicate" : "Ready"} size="small" color={hasIssue ? "warning" : "success"} variant="outlined" sx={{ height: 20, fontSize: "0.65rem" }} />
                                  <Typography variant="caption" color="text.secondary">#{row.rowNumber}</Typography>
                                </Stack>
                              </Stack>
                              <Stack spacing={0.5} sx={{ mt: 1 }}>
                                {row.email && <Typography variant="caption" noWrap>{row.email}</Typography>}
                                {row.phone && <Typography variant="caption" noWrap>{row.phone}</Typography>}
                                {row.website && <Typography variant="caption" noWrap>{row.website}</Typography>}
                              </Stack>
                              <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.5} sx={{ mt: 1 }}>
                                {row.location && <Chip label={row.location} size="small" variant="outlined" sx={{ height: 20, fontSize: "0.6rem" }} />}
                                {row.industry && <Chip label={row.industry} size="small" variant="outlined" sx={{ height: 20, fontSize: "0.6rem" }} />}
                                {row.lists.map((list, li) => <Chip key={li} label={list} size="small" variant="outlined" sx={{ height: 20, fontSize: "0.6rem" }} />)}
                              </Stack>
                              {row.notes && <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }} noWrap>{row.notes}</Typography>}
                              {hasIssue && (
                                <Alert severity="warning" sx={{ mt: 1, py: 0, "& .MuiAlert-message": { py: 0.5 } }}>
                                  {issues.map((reason, idx) => <Typography variant="caption" display="block" key={`${row.rowNumber}-${idx}`}>{reason}</Typography>)}
                                </Alert>
                              )}
                            </CardContent>
                          </Card>
                        </Grid>
                      );
                    })}
                  </Grid>
                )}
              </Grid>
            </Grid>
          </DialogContent>
        </Dialog>

        {/* ── Lead Details Dialog ── */}
        <Dialog open={showLeadDetailsModal} onClose={closeLeadDetailsModal} maxWidth="md" fullWidth fullScreen={!matchesMd} scroll="paper">
          <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
            <Box>
              <Typography variant="h6" fontWeight={800}>Lead Conversation & Files</Typography>
              <Typography variant="body2" color="text.secondary">Review CRM history, play recordings, and reply to the assigned rep.</Typography>
            </Box>
            <IconButton size="small" onClick={closeLeadDetailsModal} disabled={submittingAdminReply}><CloseRoundedIcon /></IconButton>
          </DialogTitle>
          <DialogContent dividers>
            {leadDetailsLoadingId ? (
              <LinearProgress />
            ) : leadDetailsError ? (
              <Alert severity="error">{leadDetailsError}</Alert>
            ) : !activeLeadDetails ? (
              <Alert severity="info">Lead details are unavailable.</Alert>
            ) : (
              <Stack spacing={2.5}>
                {/* Lead info card */}
                <Card variant="outlined">
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" spacing={1}>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={700}>{activeLeadDetails.clientName}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {activeLeadDetails.companyName || "No company"} · {activeLeadDetails.email || "No email"}
                        </Typography>
                      </Box>
                      <Chip label={statusLabel(activeLeadDetails.status)} variant="outlined" size="small" />
                    </Stack>
                    <Grid container spacing={1} sx={{ mt: 1.5 }}>
                      <Grid size={{ xs: 6 }}><Typography variant="caption"><strong>Phone:</strong> {activeLeadDetails.phoneFormatted || activeLeadDetails.phoneRaw || "-"}</Typography></Grid>
                      <Grid size={{ xs: 6 }}><Typography variant="caption"><strong>Due:</strong> {toIsoDateValue(activeLeadDetails.dueDate) || "-"}</Typography></Grid>
                      <Grid size={{ xs: 6 }}><Typography variant="caption"><strong>Lists:</strong> {activeLeadDetails.listItems?.join(", ") || "-"}</Typography></Grid>
                      <Grid size={{ xs: 6 }}><Typography variant="caption"><strong>Updated:</strong> {toDateTimeValue(activeLeadDetails.updatedAt)}</Typography></Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* Reply card */}
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" fontWeight={700}>Reply to CRM agent</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Add a clear instruction. It appears in the mobile CRM task timeline.
                    </Typography>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ mt: 1.5 }}>
                      <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel>Status</InputLabel>
                        <Select value={adminReplyStatus} label="Status" onChange={(e) => setAdminReplyStatus(e.target.value)}>
                          {CRM_STATUSES.map((status) => <MenuItem key={status} value={status}>{statusLabel(status)}</MenuItem>)}
                        </Select>
                      </FormControl>
                      <TextField
                        size="small"
                        fullWidth
                        multiline
                        rows={3}
                        placeholder="Add admin reply visible to CRM rep…"
                        value={adminReply}
                        onChange={(e) => setAdminReply(e.target.value)}
                      />
                    </Stack>
                    <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1.5 }}>
                      <Button
                        variant="contained"
                        startIcon={<SendRoundedIcon />}
                        onClick={() => void submitAdminLeadReply()}
                        disabled={submittingAdminReply || !adminReply.trim()}
                      >
                        {submittingAdminReply ? "Sending…" : "Send Reply"}
                      </Button>
                    </Box>
                  </CardContent>
                </Card>

                {/* Activity timeline */}
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" fontWeight={700}>Activity Timeline</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Every comment, attachment, and voice note between admin and CRM rep.
                    </Typography>

                    {activeLeadUpdates.length === 0 ? (
                      <Alert severity="info" sx={{ mt: 2 }}>No updates yet on this lead.</Alert>
                    ) : (
                      <Stack spacing={1.5} sx={{ mt: 2 }}>
                        {activeLeadUpdates.map((update, idx) => {
                          const updateId = normalizeUpdateId(update._id);
                          return (
                            <Card key={updateId || `${idx}-${update.createdAt || "na"}`} variant="outlined">
                              <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                  <Typography variant="caption" fontWeight={700}>{leadUpdateAuthorLabel(update)}</Typography>
                                  <Typography variant="caption" color="text.secondary">{toDateTimeValue(update.createdAt)}</Typography>
                                </Stack>
                                <Typography variant="caption" color="text.secondary">Status: {statusLabel(update.status || activeLeadDetails.status)}</Typography>

                                <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                                  {update.editedAt && !update.isDeleted && <Chip label="Edited" size="small" color="info" variant="outlined" sx={{ height: 18, fontSize: "0.6rem" }} />}
                                  {update.isDeleted && <Chip label="Deleted" size="small" color="error" variant="outlined" sx={{ height: 18, fontSize: "0.6rem" }} />}
                                </Stack>

                                {update.isDeleted && (
                                  <Alert severity="error" sx={{ mt: 1, py: 0 }}>This update was deleted.</Alert>
                                )}

                                {!update.isDeleted && editingUpdateId === updateId && (
                                  <Stack spacing={1} sx={{ mt: 1 }}>
                                    <TextField size="small" multiline rows={3} value={editingComment} onChange={(e) => setEditingComment(e.target.value)} placeholder="Edit update message" fullWidth />
                                    <FormControl size="small" fullWidth>
                                      <Select value={editingStatus} onChange={(e) => setEditingStatus(e.target.value)}>
                                        {CRM_STATUSES.map((status) => <MenuItem key={`${updateId}-${status}`} value={status}>{statusLabel(status)}</MenuItem>)}
                                      </Select>
                                    </FormControl>
                                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                                      <Button size="small" variant="outlined" onClick={cancelEditLeadUpdate} disabled={timelineBusyKey === `edit:${updateId}`}>Cancel</Button>
                                      <Button size="small" variant="contained" onClick={() => void saveEditedLeadUpdate(update)} disabled={timelineBusyKey === `edit:${updateId}`}>
                                        {timelineBusyKey === `edit:${updateId}` ? "Saving…" : "Save"}
                                      </Button>
                                    </Stack>
                                  </Stack>
                                )}

                                {!update.isDeleted && update.comment && (
                                  <Typography variant="body2" sx={{ mt: 1, p: 1, borderRadius: 1, bgcolor: "action.hover" }}>{update.comment}</Typography>
                                )}

                                {!update.isDeleted && editingUpdateId !== updateId && (
                                  <Stack direction="row" spacing={0.5} sx={{ mt: 1 }}>
                                    <Button size="small" variant="outlined" startIcon={<EditRoundedIcon sx={{ fontSize: 14 }} />} onClick={() => beginEditLeadUpdate(update)} disabled={Boolean(timelineBusyKey) || !updateId}>Edit</Button>
                                    <Button size="small" variant="outlined" color="error" startIcon={<DeleteRoundedIcon sx={{ fontSize: 14 }} />} onClick={() => void deleteLeadUpdate(update)} disabled={timelineBusyKey === `delete:${updateId}` || !updateId}>
                                      {timelineBusyKey === `delete:${updateId}` ? "…" : "Delete"}
                                    </Button>
                                  </Stack>
                                )}

                                {!update.isDeleted && update.attachmentUrls?.length ? (
                                  <Box sx={{ mt: 1.5 }}>
                                    <Typography variant="caption" fontWeight={600}><AttachFileRoundedIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: "text-bottom" }} />Attachments</Typography>
                                    <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} sx={{ mt: 0.5 }}>
                                      {update.attachmentUrls.map((url, fileIdx) => (
                                        <Card key={`${url}-${fileIdx}`} variant="outlined" sx={{ p: 1 }}>
                                          {isLikelyImageUrl(url) ? (
                                            <a href={url} target="_blank" rel="noreferrer">
                                              {/* eslint-disable-next-line @next/next/no-img-element */}
                                              <img src={url} alt={`Attachment ${fileIdx + 1}`} style={{ height: 80, width: 120, objectFit: "cover", borderRadius: 4 }} />
                                            </a>
                                          ) : (
                                            <Button size="small" href={url} target="_blank" rel="noreferrer">File {fileIdx + 1}</Button>
                                          )}
                                          <Button size="small" color="error" fullWidth sx={{ mt: 0.5, fontSize: "0.65rem" }} onClick={() => void deleteLeadUpdateAttachment(update, url)} disabled={timelineBusyKey === `attachment:${updateId}:${url}` || !updateId}>
                                            {timelineBusyKey === `attachment:${updateId}:${url}` ? "…" : "Remove"}
                                          </Button>
                                        </Card>
                                      ))}
                                    </Stack>
                                  </Box>
                                ) : null}

                                {!update.isDeleted && update.recordingUrl && (
                                  <Box sx={{ mt: 1.5 }}>
                                    <Typography variant="caption" fontWeight={600}><MicRoundedIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: "text-bottom" }} />Voice Recording</Typography>
                                    <audio controls src={update.recordingUrl} style={{ width: "100%", marginTop: 4 }} preload="none" />
                                    <Button size="small" color="error" sx={{ mt: 0.5 }} onClick={() => void deleteLeadUpdateRecording(update)} disabled={timelineBusyKey === `recording:${updateId}` || !updateId}>
                                      {timelineBusyKey === `recording:${updateId}` ? "Deleting…" : "Delete audio"}
                                    </Button>
                                  </Box>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </Stack>
                    )}
                  </CardContent>
                </Card>
              </Stack>
            )}
          </DialogContent>
        </Dialog>

      </Stack>

      {/* ── Toast notifications ── */}
      {toasts.map((t) => (
        <Snackbar key={t.id} open anchorOrigin={{ vertical: "bottom", horizontal: "right" }} sx={{ position: "fixed" }}>
          <Alert severity={t.type === "success" ? "success" : t.type === "error" ? "error" : "info"} variant="filled" sx={{ width: "100%" }}>
            {t.message}
          </Alert>
        </Snackbar>
      ))}
    </Box>
  );
}
