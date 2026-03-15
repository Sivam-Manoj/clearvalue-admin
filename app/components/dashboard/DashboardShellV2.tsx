"use client";

import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import SettingsEthernetRoundedIcon from "@mui/icons-material/SettingsEthernetRounded";
import WarehouseRoundedIcon from "@mui/icons-material/WarehouseRounded";
import {
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import MonthlyCharts from "@/app/components/dashboard/MonthlyCharts";

type MeState = {
  email?: string;
  username?: string;
  role?: string;
} | null;

type StatsState = {
  totalUsers: number;
  totalAdmins: number;
  totalReports: number;
  byType: { Asset: number; RealEstate: number; Salvage: number };
} | null;

const statCards: Array<{ key: "totalUsers" | "totalAdmins" | "totalReports"; label: string; icon: ReactNode; color: string }> = [
  { key: "totalUsers", label: "Users", icon: <GroupRoundedIcon />, color: "#2563eb" },
  { key: "totalAdmins", label: "Admins", icon: <ManageAccountsRoundedIcon />, color: "#7c3aed" },
  { key: "totalReports", label: "Total Reports", icon: <AssessmentRoundedIcon />, color: "#d97706" },
];

const reportCards: Array<{ key: "Asset" | "RealEstate" | "Salvage"; label: string; icon: ReactNode; color: string }> = [
  { key: "Asset", label: "Asset Reports", icon: <WarehouseRoundedIcon />, color: "#0ea5e9" },
  { key: "RealEstate", label: "Real Estate Reports", icon: <DashboardRoundedIcon />, color: "#10b981" },
  { key: "Salvage", label: "Salvage Reports", icon: <CheckCircleRoundedIcon />, color: "#f59e0b" },
];

type QuickAction = {
  href: string;
  label: string;
  color: "primary" | "success" | "secondary";
  icon: ReactNode;
};

export default function DashboardShellV2() {
  const [now, setNow] = useState<Date>(() => new Date());
  const [me, setMe] = useState<MeState>(null);
  const [stats, setStats] = useState<StatsState>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/me", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        setMe(data?.user || null);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setStatsLoading(true);
        const res = await fetch("/api/admin/stats", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (res.ok) setStats(data);
      } finally {
        setStatsLoading(false);
      }
    })();
  }, []);

  const greeting = useMemo(() => {
    const hours = now.getHours();
    if (hours < 12) return "Good morning";
    if (hours < 18) return "Good afternoon";
    return "Good evening";
  }, [now]);

  const quickActions = useMemo<QuickAction[]>(() => {
    const actions: QuickAction[] = [
      { href: "/reports", label: "Reports", color: "primary", icon: <AssessmentRoundedIcon /> },
    ];

    if (me?.role === "admin" || me?.role === "superadmin") {
      actions.push({
        href: "/approvals",
        label: "Approvals",
        color: "success",
        icon: <CheckCircleRoundedIcon />,
      });
    }

    if (me?.role === "superadmin") {
      actions.push({
        href: "/admins",
        label: "Manage Admins",
        color: "secondary",
        icon: <ManageAccountsRoundedIcon />,
      });
    }

    return actions;
  }, [me?.role]);

  return (
    <Box sx={{ pb: 6 }}>
      <Container maxWidth="xl" sx={{ px: { xs: 2, md: 3 }, py: { xs: 3, md: 4 } }}>
        <Card sx={{ overflow: "hidden", position: "relative" }}>
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              background: "radial-gradient(circle at top left, rgba(37,99,235,0.18), transparent 28%), radial-gradient(circle at top right, rgba(124,58,237,0.16), transparent 24%)",
              pointerEvents: "none",
            }}
          />
          <CardContent sx={{ p: { xs: 3, md: 4 }, position: "relative" }}>
            <Stack spacing={2.5}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }}>
                <Box>
                  <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 800, letterSpacing: "0.12em" }}>
                    Operations Overview
                  </Typography>
                  <Typography variant="h3" sx={{ mt: 0.5 }}>
                    {greeting}{me ? `, ${me.username || me.email}` : ""}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 760 }}>
                    Manage reports, users, approvals, and CRM workflows from a unified control center with live visibility into team activity.
                  </Typography>
                </Box>
                <Stack spacing={1.25} alignItems={{ xs: "flex-start", md: "flex-end" }}>
                  {me?.role ? <Chip label={me.role} color="primary" variant="outlined" /> : null}
                  <Typography variant="body2" color="text.secondary" suppressHydrationWarning>
                    {now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Typography>
                </Stack>
              </Stack>

              <Grid container spacing={2.5}>
                {statCards.map((card) => (
                  <Grid key={card.key} size={{ xs: 12, sm: 6, lg: 4 }}>
                    <Card sx={{ height: "100%" }}>
                      <CardContent>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                          <Box>
                            <Typography variant="body2" color="text.secondary">{card.label}</Typography>
                            <Typography variant="h4" suppressHydrationWarning sx={{ mt: 0.75 }}>
                              {statsLoading ? "…" : stats?.[card.key] ?? 0}
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              width: 54,
                              height: 54,
                              borderRadius: 4,
                              display: "grid",
                              placeItems: "center",
                              bgcolor: alpha(card.color, 0.12),
                              color: card.color,
                              boxShadow: `inset 0 1px 0 ${alpha("#fff", 0.3)}`,
                            }}
                          >
                            {card.icon}
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}

                {reportCards.map((card) => (
                  <Grid key={card.key} size={{ xs: 12, sm: 6, lg: 4 }}>
                    <Card sx={{ height: "100%" }}>
                      <CardContent>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                          <Box>
                            <Typography variant="body2" color="text.secondary">{card.label}</Typography>
                            <Typography variant="h4" suppressHydrationWarning sx={{ mt: 0.75 }}>
                              {statsLoading ? "…" : stats?.byType?.[card.key] ?? 0}
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              width: 54,
                              height: 54,
                              borderRadius: 4,
                              display: "grid",
                              placeItems: "center",
                              bgcolor: alpha(card.color, 0.12),
                              color: card.color,
                            }}
                          >
                            {card.icon}
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Stack>
          </CardContent>
        </Card>

        <Grid container spacing={2.5} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Quick Actions
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, mb: 2.5 }}>
                  Jump into the most common operational workflows.
                </Typography>
                <Stack direction="row" spacing={1.25} useFlexGap flexWrap="wrap">
                  {quickActions.map((action) => (
                    <Button
                      key={action.href}
                      component={Link}
                      href={action.href}
                      variant="contained"
                      color={action.color}
                      startIcon={action.icon}
                    >
                      {action.label}
                    </Button>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, lg: 4 }}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box
                    sx={{
                      width: 46,
                      height: 46,
                      borderRadius: 3.5,
                      display: "grid",
                      placeItems: "center",
                      bgcolor: "action.selected",
                      color: "success.main",
                    }}
                  >
                    <SettingsEthernetRoundedIcon />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      System Status
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Ready for additional health checks and metrics.
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ mt: 3 }}>
          <MonthlyCharts />
        </Box>
      </Container>
    </Box>
  );
}
