"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import ConfirmModal from "@/app/components/common/ConfirmModal";
import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
} from "@mui/material";

type ReportItem = {
  _id: string;
  filename: string;
  address: string;
  fairMarketValue: string;
  user?: { email?: string; username?: string } | null;
  reportType: "RealEstate" | "Salvage" | "Asset" | "LotListing" | string;
  createdAt: string;
  reportModel?: string;
  fileType?: "pdf" | "docx" | "xlsx" | "images";
  approvalStatus?: "pending" | "approved" | "rejected";
  report?: string;
  contract_no?: string;
  preview_files?: { docx?: string; excel?: string; images?: string };
  isRealEstateReport?: boolean;
  isLotListingReport?: boolean;
  property_type?: string;
  language?: string;
};

type ApiResponse = {
  items: ReportItem[];
  total: number;
  page: number;
  limit: number;
};

type ReportGroup = {
  key: string;
  title: string;
  contract_no?: string;
  reportType: string;
  createdAt: string;
  fairMarketValue: string;
  userEmail?: string;
  variants: { pdf?: ReportItem; docx?: ReportItem; xlsx?: ReportItem; images?: ReportItem };
  isAssetReport?: boolean;
  isRealEstateReport?: boolean;
  isLotListingReport?: boolean;
  preview_files?: { docx?: string; excel?: string; images?: string };
};

function formatFMV(value: string) {
  return value || "N/A";
}

function getReportTypeLabel(reportType: string) {
  return reportType === "LotListing" ? "Lot Listing" : reportType;
}

function buildDownloadLinks(group: ReportGroup) {
  if (group.isLotListingReport && group.preview_files) {
    return [
      { label: "Excel", href: group.preview_files.excel },
      { label: "Images", href: group.preview_files.images },
    ];
  }

  if ((group.isAssetReport || group.isRealEstateReport) && group.preview_files) {
    return [
      { label: "DOCX", href: group.preview_files.docx },
      { label: "Excel", href: group.preview_files.excel },
      { label: "Images", href: group.preview_files.images },
    ];
  }

  return [
    {
      label: "DOCX",
      href: group.variants.docx ? `/api/admin/reports/${group.variants.docx._id}/download` : undefined,
    },
    {
      label: "Excel",
      href:
        group.variants.xlsx && group.variants.xlsx.approvalStatus === "approved"
          ? `/api/admin/reports/${group.variants.xlsx._id}/download`
          : undefined,
    },
    {
      label: "Images",
      href:
        group.variants.images && group.variants.images.approvalStatus === "approved"
          ? `/api/admin/reports/${group.variants.images._id}/download`
          : undefined,
    },
  ];
}

export default function AdminReports() {
  // Filters
  const [q, setQ] = useState("");
  const [reportType, setReportType] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(200);
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);

  // Data
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (reportType) p.set("reportType", reportType);
    p.set("approvalStatus", "approved");
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
      const res = await fetch(`/api/admin/reports?${queryString}&_t=${Date.now()}`, {
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

  const groups = useMemo<ReportGroup[]>(() => {
    const map = new Map<string, ReportGroup>();
    const items = (data?.items || []) as ReportItem[];
    for (const r of items) {
      const key = String((r.report as string | undefined) || r._id);
      let g = map.get(key);
      if (!g) {
        const base = r.reportType === "RealEstate" ? "Real Estate" : r.reportType === "Salvage" ? "Salvage" : r.reportType === "LotListing" ? "Lot Listing" : "Asset";
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
          isAssetReport: !!(r as any).preview_files && r.reportType === 'Asset',
          isRealEstateReport: !!(r as any).preview_files && (r.reportType === 'RealEstate' || (r as any).isRealEstateReport),
          isLotListingReport: !!(r as any).preview_files && (r.reportType === 'LotListing' || (r as any).isLotListingReport),
          preview_files: (r as any).preview_files,
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
    // Sort by newest first regardless of report type
    return Array.from(map.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [data]);

  const columns = useMemo<ColumnDef<ReportGroup>[]>(
    () => [
      {
        id: "title",
        accessorKey: "title",
        header: "Report",
        cell: ({ row }) => (
          <Stack spacing={0.25} minWidth={0}>
            <Typography variant="body2" sx={{ fontWeight: 700, wordBreak: "break-word" }}>
              {row.original.title}
            </Typography>
          </Stack>
        ),
      },
      {
        id: "contract_no",
        accessorFn: (row) => row.contract_no || "",
        header: "Contract No",
        cell: ({ row }) => row.original.contract_no || "-",
      },
      {
        id: "fairMarketValue",
        accessorFn: (row) => row.fairMarketValue || "",
        header: "FMV",
        cell: ({ row }) => (
          <Chip size="small" color="success" label={formatFMV(row.original.fairMarketValue)} />
        ),
      },
      {
        id: "reportType",
        accessorFn: (row) => getReportTypeLabel(row.reportType),
        header: "Type",
        cell: ({ row }) => (
          <Chip size="small" variant="outlined" color="secondary" label={getReportTypeLabel(row.original.reportType)} />
        ),
      },
      {
        id: "createdAt",
        accessorFn: (row) => new Date(row.createdAt).getTime(),
        header: "Created At",
        cell: ({ row }) => new Date(row.original.createdAt).toLocaleString(),
      },
      {
        id: "userEmail",
        accessorFn: (row) => row.userEmail || "",
        header: "Created By",
        cell: ({ row }) => row.original.userEmail || "-",
      },
      {
        id: "actions",
        enableSorting: false,
        header: "Actions",
        cell: ({ row }) => (
          <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="flex-end">
            {buildDownloadLinks(row.original).map((link) => (
              <Button
                key={`${row.original.key}-${link.label}`}
                size="small"
                variant="contained"
                color="primary"
                href={link.href || undefined}
                target={link.href ? "_blank" : undefined}
                rel={link.href ? "noopener noreferrer" : undefined}
                disabled={!link.href}
              >
                {link.label}
              </Button>
            ))}
            <Button size="small" variant="outlined" color="error" onClick={() => openDelete(row.original.key)}>
              Delete
            </Button>
          </Stack>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: groups,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rows = table.getRowModel().rows;

  return (
    <div className="admin-page-shell">
      <main className="max-w-6xl mx-auto space-y-6">
        {/* Hero Summary */}
        <section className="admin-glass-surface rounded-3xl p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
                Approved Reports
              </h1>
              <p className="text-gray-600">
                Search and filter approved reports. View who created them and when.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="rounded-xl border border-rose-200 bg-white/70 px-4 py-2 shadow-sm">
                <div className="text-xs text-gray-600">Approved</div>
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
        <section className="admin-glass-surface rounded-3xl p-4 md:p-6">
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="Search"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Filename or address"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select
                  value={reportType}
                  label="Type"
                  onChange={(e) => {
                    setReportType(e.target.value);
                    setPage(1);
                  }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="RealEstate">Real Estate</MenuItem>
                  <MenuItem value="Salvage">Salvage</MenuItem>
                  <MenuItem value="Asset">Asset</MenuItem>
                  <MenuItem value="LotListing">Lot Listing</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="From"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPage(1);
                }}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="To"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPage(1);
                }}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                fullWidth
                size="small"
                label="Created By"
                value={userEmail}
                onChange={(e) => {
                  setUserEmail(e.target.value);
                  setPage(1);
                }}
                placeholder="user@example.com"
              />
            </Grid>
          </Grid>
          <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
            <Button variant="contained" onClick={() => load()}>Apply</Button>
            <Button variant="outlined" color="secondary" onClick={onReset}>Reset</Button>
          </Stack>
        </section>

        {/* List */}
        <section className="admin-glass-surface rounded-3xl p-4 md:p-6">
          {loading ? (
            <Typography color="text.secondary">Loading...</Typography>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : (
            <>
              {/* Table on md+ */}
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="h6" fontWeight={700}>Approved Reports</Typography>
                <Chip size="small" color="secondary" variant="outlined" label={`${rows.length} visible`} />
              </Stack>
              <TableContainer className="hidden md:block">
                <Table size="small" sx={{ minWidth: 980 }}>
                  <TableHead>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableCell
                            key={header.id}
                            align={header.column.id === "actions" ? "right" : "left"}
                            sx={{ fontWeight: 700 }}
                          >
                            {header.isPlaceholder ? null : header.column.getCanSort() ? (
                              <TableSortLabel
                                active={!!header.column.getIsSorted()}
                                direction={header.column.getIsSorted() === "desc" ? "desc" : "asc"}
                                onClick={header.column.getToggleSortingHandler()}
                              >
                                {flexRender(header.column.columnDef.header, header.getContext())}
                              </TableSortLabel>
                            ) : (
                              flexRender(header.column.columnDef.header, header.getContext())
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableHead>
                  <TableBody>
                    {rows.length ? (
                      rows.map((row) => (
                        <TableRow key={row.id} hover>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id} align={cell.column.id === "actions" ? "right" : "left"}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={columns.length}>
                          <Typography color="text.secondary">No approved reports match the current filters.</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Cards on mobile */}
              <Stack spacing={2} className="md:hidden">
                {rows.length ? (
                  rows.map((row) => {
                    const g = row.original;
                    return (
                      <Card key={g.key} variant="outlined">
                        <CardContent>
                          <Stack spacing={1.5}>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
                              <Stack spacing={0.5} minWidth={0}>
                                <Typography variant="subtitle2" sx={{ wordBreak: "break-word" }}>{g.title}</Typography>
                                <Typography variant="body2" color="text.secondary">Contract: {g.contract_no || "-"}</Typography>
                              </Stack>
                              <Chip size="small" variant="outlined" color="secondary" label={getReportTypeLabel(g.reportType)} />
                            </Stack>
                            <Grid container spacing={1.5}>
                              <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="caption" color="text.secondary">FMV</Typography>
                                <Stack sx={{ mt: 0.5 }}>
                                  <Chip size="small" color="success" label={formatFMV(g.fairMarketValue)} sx={{ alignSelf: "flex-start" }} />
                                </Stack>
                              </Grid>
                              <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="caption" color="text.secondary">Created</Typography>
                                <Typography variant="body2">{new Date(g.createdAt).toLocaleString()}</Typography>
                              </Grid>
                              <Grid size={{ xs: 12 }}>
                                <Typography variant="caption" color="text.secondary">Created By</Typography>
                                <Typography variant="body2">{g.userEmail || "-"}</Typography>
                              </Grid>
                            </Grid>
                            <Stack direction="row" spacing={1} flexWrap="wrap">
                              {buildDownloadLinks(g).map((link) => (
                                <Button
                                  key={`${g.key}-${link.label}`}
                                  size="small"
                                  variant="contained"
                                  color="primary"
                                  href={link.href || undefined}
                                  target={link.href ? "_blank" : undefined}
                                  rel={link.href ? "noopener noreferrer" : undefined}
                                  disabled={!link.href}
                                >
                                  {link.label}
                                </Button>
                              ))}
                              <Button size="small" variant="outlined" color="error" onClick={() => openDelete(g.key)}>
                                Delete
                              </Button>
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <Card variant="outlined">
                    <CardContent>
                      <Typography color="text.secondary">No approved reports match the current filters.</Typography>
                    </CardContent>
                  </Card>
                )}
              </Stack>

              {/* Pagination */}
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} sx={{ mt: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  {data ? (
                    <>
                      Showing {data.items?.length || 0} of {data.total} approved reports
                    </>
                  ) : null}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button variant="outlined" color="secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                    Prev
                  </Button>
                  <Typography variant="body2" sx={{ minWidth: 100, textAlign: "center" }}>
                    Page {page} of {totalPages}
                  </Typography>
                  <Button variant="outlined" color="secondary" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
                    Next
                  </Button>
                </Stack>
              </Stack>
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
