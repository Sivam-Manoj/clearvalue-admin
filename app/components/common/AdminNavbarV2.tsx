"use client";

import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import ThemeModeToggle from "@/app/components/common/ThemeModeToggle";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

export default function AdminNavbarV2() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        let res = await fetch("/api/admin/me", { cache: "no-store" });
        if (res.status === 401) {
          const refresh = await fetch("/api/admin/refresh", {
            method: "POST",
            cache: "no-store",
          });
          if (refresh.ok) {
            res = await fetch("/api/admin/me", { cache: "no-store" });
          }
        }
        if (!res.ok || !mounted) return;
        const data = await res.json().catch(() => ({}));
        if (!mounted) return;
        setRole(data?.user?.role || null);
      } catch {}
    })();

    const intervalId = window.setInterval(() => {
      fetch("/api/admin/refresh", { method: "POST", cache: "no-store" }).catch(() => {});
    }, 20 * 60 * 1000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const roleLabel =
    role === "superadmin"
      ? "Super Admin"
      : role === "admin"
        ? "Admin"
        : role === "user"
          ? "User"
          : "Loading";

  const homeHref = role === "superadmin" || role === "admin" ? "/dashboard" : "/reports";

  const items = useMemo<NavItem[]>(() => {
    if (role === "user") {
      return [
        { href: "/reports", label: "Approved Reports", icon: <AssessmentRoundedIcon fontSize="small" /> },
        { href: "/gallery", label: "Image Gallery", icon: <ImageRoundedIcon fontSize="small" /> },
      ];
    }

    if (role === "superadmin" || role === "admin") {
      return [
        { href: "/dashboard", label: "Dashboard", icon: <DashboardRoundedIcon fontSize="small" /> },
        { href: "/reports", label: "Approved Reports", icon: <AssessmentRoundedIcon fontSize="small" /> },
        { href: "/users", label: "Users", icon: <GroupsRoundedIcon fontSize="small" /> },
        { href: "/crm", label: "CRM", icon: <SupportAgentRoundedIcon fontSize="small" /> },
        { href: "/approvals", label: "Pending Approvals", icon: <CheckCircleRoundedIcon fontSize="small" /> },
        ...(role === "superadmin"
          ? [{ href: "/admins", label: "Admins", icon: <ManageAccountsRoundedIcon fontSize="small" /> }]
          : []),
        { href: "/gallery", label: "Image Gallery", icon: <ImageRoundedIcon fontSize="small" /> },
      ];
    }

    return [];
  }, [role]);

  async function onLogout() {
    try {
      setLoggingOut(true);
      await fetch("/api/admin/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <>
      <AppBar position="fixed" color="transparent" elevation={0} sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
        <Toolbar disableGutters sx={{ px: { xs: 2, md: 3 }, minHeight: { xs: 74, md: 82 } }}>
          <Container maxWidth="xl" sx={{ px: "0 !important" }}>
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
              <Stack direction="row" spacing={1.5} alignItems="center" minWidth={0}>
                <Paper
                  component={Link}
                  href={homeHref}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    px: 1.25,
                    py: 1,
                    minWidth: 0,
                    borderRadius: 4,
                    textDecoration: "none",
                    bgcolor: "background.paper",
                  }}
                >
                  <Avatar
                    variant="rounded"
                    sx={{
                      width: 42,
                      height: 42,
                      fontWeight: 800,
                      background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
                      boxShadow: "0 14px 28px rgba(37,99,235,0.28)",
                    }}
                  >
                    CV
                  </Avatar>
                  <Box minWidth={0}>
                    <Typography variant="caption" sx={{ display: "block", color: "text.secondary", lineHeight: 1.2 }}>
                      Asset Insight
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, whiteSpace: "nowrap" }}>
                      Admin Console
                    </Typography>
                  </Box>
                </Paper>

                <Stack direction="row" spacing={1} alignItems="center" sx={{ display: { xs: "none", lg: "flex" }, overflowX: "auto", pb: 0.5 }}>
                  {items.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <Button
                        key={item.href}
                        component={Link}
                        href={item.href}
                        startIcon={item.icon}
                        variant={active ? "contained" : "outlined"}
                        color={active ? "primary" : "inherit"}
                        sx={{
                          flexShrink: 0,
                          borderColor: active ? "transparent" : "divider",
                          bgcolor: active ? undefined : "background.paper",
                        }}
                      >
                        {item.label}
                      </Button>
                    );
                  })}
                </Stack>
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  label={roleLabel}
                  color="success"
                  variant="outlined"
                  sx={{ display: { xs: "none", sm: "inline-flex" }, fontWeight: 700, backdropFilter: "blur(12px)" }}
                />
                <ThemeModeToggle />
                <Button
                  onClick={onLogout}
                  disabled={loggingOut}
                  color="inherit"
                  variant="outlined"
                  startIcon={<LogoutRoundedIcon />}
                  sx={{ display: { xs: "none", md: "inline-flex" }, borderColor: "divider" }}
                >
                  {loggingOut ? "Logging out..." : "Logout"}
                </Button>
                <IconButton
                  onClick={() => setDrawerOpen(true)}
                  sx={{ display: { lg: "none" }, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}
                >
                  <MenuRoundedIcon />
                </IconButton>
              </Stack>
            </Stack>
          </Container>
        </Toolbar>
      </AppBar>

      <Toolbar sx={{ minHeight: { xs: 74, md: 82 } }} />

      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 320, maxWidth: "100vw", p: 2.25 }} role="presentation">
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Navigation
            </Typography>
            <Chip label={roleLabel} color="success" variant="outlined" />
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25, mb: 2.5 }}>
            Responsive admin controls with live theme switching.
          </Typography>
          <Divider sx={{ mb: 1.5 }} />
          <List sx={{ py: 0 }}>
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <ListItemButton
                  key={item.href}
                  component={Link}
                  href={item.href}
                  selected={active}
                  sx={{
                    borderRadius: 3,
                    mb: 0.75,
                    border: "1px solid",
                    borderColor: active ? "primary.main" : "divider",
                    bgcolor: active ? "action.selected" : "transparent",
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 38, color: active ? "primary.main" : "text.secondary" }}>{item.icon}</ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ fontWeight: active ? 800 : 600 }}
                  />
                </ListItemButton>
              );
            })}
          </List>
          <Divider sx={{ my: 1.5 }} />
          <Stack spacing={1.25}>
            <Button component={Link} href={homeHref} variant="outlined" color="inherit">
              Home
            </Button>
            <Button onClick={onLogout} disabled={loggingOut} variant="contained" color="primary" startIcon={<LogoutRoundedIcon />}>
              {loggingOut ? "Logging out..." : "Logout"}
            </Button>
          </Stack>
        </Box>
      </Drawer>
    </>
  );
}
