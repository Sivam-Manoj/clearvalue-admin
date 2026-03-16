"use client";

import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import ThemeModeToggle from "@/app/components/common/ThemeModeToggle";

const SIDEBAR_WIDTH = 272;

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

export default function AdminNavbarV2({ children }: { children?: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));
  const [role, setRole] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
    setMobileOpen(false);
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
        { href: "/reports", label: "Reports", icon: <AssessmentRoundedIcon fontSize="small" /> },
        { href: "/users", label: "Users", icon: <GroupsRoundedIcon fontSize="small" /> },
        { href: "/crm", label: "CRM", icon: <SupportAgentRoundedIcon fontSize="small" /> },
        { href: "/approvals", label: "Approvals", icon: <CheckCircleRoundedIcon fontSize="small" /> },
        ...(role === "superadmin"
          ? [{ href: "/admins", label: "Admins", icon: <ManageAccountsRoundedIcon fontSize="small" /> }]
          : []),
        { href: "/gallery", label: "Gallery", icon: <ImageRoundedIcon fontSize="small" /> },
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

  const sidebarContent = (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        py: 2,
        px: 1.5,
      }}
    >
      {/* Brand */}
      <Box
        component={Link}
        href={homeHref}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          px: 1.5,
          py: 1.5,
          mb: 1,
          borderRadius: 3,
          textDecoration: "none",
          transition: "background 200ms",
          "&:hover": { bgcolor: "action.hover" },
        }}
      >
        <Avatar
          variant="rounded"
          sx={{
            width: 44,
            height: 44,
            fontWeight: 800,
            fontSize: "1rem",
            background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
            boxShadow: "0 8px 24px rgba(37,99,235,0.32)",
            borderRadius: 3,
          }}
        >
          CV
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" sx={{ display: "block", color: "text.secondary", lineHeight: 1.2, fontSize: "0.68rem" }}>
            Asset Insight
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, whiteSpace: "nowrap", lineHeight: 1.3 }}>
            Admin Console
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ mx: 1, mb: 1 }} />

      {/* Nav items */}
      <List sx={{ flex: 1, py: 0, px: 0.5 }}>
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              selected={active}
              sx={{
                borderRadius: 2.5,
                mb: 0.5,
                px: 1.5,
                py: 1,
                minHeight: 44,
                transition: "all 180ms ease",
                border: "1px solid",
                borderColor: active ? "primary.main" : "transparent",
                bgcolor: active ? "action.selected" : "transparent",
                boxShadow: active
                  ? "0 4px 16px rgba(37,99,235,0.15), inset 0 1px 0 rgba(255,255,255,0.1)"
                  : "none",
                "&:hover": {
                  bgcolor: active ? "action.selected" : "action.hover",
                  transform: "translateX(2px)",
                  boxShadow: active
                    ? "0 6px 20px rgba(37,99,235,0.20)"
                    : "0 2px 8px rgba(0,0,0,0.06)",
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 36,
                  color: active ? "primary.main" : "text.secondary",
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontSize: "0.85rem",
                  fontWeight: active ? 700 : 500,
                  color: active ? "primary.main" : "text.primary",
                }}
              />
            </ListItemButton>
          );
        })}
      </List>

      <Divider sx={{ mx: 1, my: 1 }} />

      {/* Footer controls */}
      <Stack spacing={1} sx={{ px: 1 }}>
        <Chip
          label={roleLabel}
          color="primary"
          variant="outlined"
          size="small"
          sx={{ fontWeight: 700, alignSelf: "flex-start" }}
        />
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <ThemeModeToggle />
          <Button
            onClick={onLogout}
            disabled={loggingOut}
            color="inherit"
            size="small"
            startIcon={<LogoutRoundedIcon sx={{ fontSize: 18 }} />}
            sx={{
              fontSize: "0.78rem",
              color: "text.secondary",
              "&:hover": { color: "error.main" },
            }}
          >
            {loggingOut ? "Logging out…" : "Logout"}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* ── Desktop permanent sidebar ── */}
      {isDesktop && (
        <Box
          component="nav"
          sx={{
            width: SIDEBAR_WIDTH,
            flexShrink: 0,
            position: "fixed",
            top: 0,
            left: 0,
            bottom: 0,
            zIndex: (t) => t.zIndex.drawer,
            borderRight: "1px solid",
            borderColor: "divider",
            backgroundImage: (t) =>
              t.palette.mode === "dark"
                ? "linear-gradient(195deg, rgba(15,27,45,0.97), rgba(9,17,31,0.98))"
                : "linear-gradient(195deg, rgba(255,255,255,0.98), rgba(246,249,255,0.97))",
            backdropFilter: "blur(20px)",
            boxShadow: (t) =>
              t.palette.mode === "dark"
                ? "4px 0 24px rgba(0,0,0,0.35)"
                : "4px 0 24px rgba(37,99,235,0.08)",
          }}
        >
          {sidebarContent}
        </Box>
      )}

      {/* ── Mobile top bar ── */}
      {!isDesktop && (
        <Box
          component="header"
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: (t) => t.zIndex.appBar,
            borderBottom: "1px solid",
            borderColor: "divider",
            backgroundImage: (t) =>
              t.palette.mode === "dark"
                ? "linear-gradient(135deg, rgba(15,23,42,0.92), rgba(13,27,45,0.80))"
                : "linear-gradient(135deg, rgba(255,255,255,0.94), rgba(241,245,255,0.88))",
            backdropFilter: "blur(20px)",
            boxShadow: (t) =>
              t.palette.mode === "dark"
                ? "0 4px 20px rgba(0,0,0,0.4)"
                : "0 4px 20px rgba(37,99,235,0.10)",
          }}
        >
          <Toolbar sx={{ minHeight: 64, px: 2, justifyContent: "space-between" }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Avatar
                component={Link}
                href={homeHref}
                variant="rounded"
                sx={{
                  width: 36,
                  height: 36,
                  fontWeight: 800,
                  fontSize: "0.85rem",
                  background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
                  boxShadow: "0 6px 18px rgba(37,99,235,0.30)",
                  borderRadius: 2,
                  textDecoration: "none",
                }}
              >
                CV
              </Avatar>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                Admin
              </Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <ThemeModeToggle />
              <IconButton
                onClick={() => setMobileOpen(true)}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: "background.paper",
                }}
              >
                <MenuRoundedIcon />
              </IconButton>
            </Stack>
          </Toolbar>
        </Box>
      )}

      {/* ── Mobile drawer ── */}
      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { lg: "none" },
          "& .MuiDrawer-paper": {
            width: SIDEBAR_WIDTH,
            boxSizing: "border-box",
          },
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "flex-end", pt: 1, pr: 1 }}>
          <IconButton size="small" onClick={() => setMobileOpen(false)}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Box>
        {sidebarContent}
      </Drawer>

      {/* ── Main content area ── */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          ml: isDesktop ? `${SIDEBAR_WIDTH}px` : 0,
          mt: isDesktop ? 0 : "64px",
          minHeight: isDesktop ? "100vh" : "calc(100vh - 64px)",
          overflow: "auto",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
