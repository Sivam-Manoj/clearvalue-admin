"use client";

import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";
import Image from "next/image";
import {
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
  useMediaQuery,
  useTheme,
} from "@mui/material";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import ThemeModeToggle from "@/app/components/common/ThemeModeToggle";

const SIDEBAR_WIDTH = 272;
const SIDEBAR_COLLAPSED_WIDTH = 92;
const MOBILE_DRAWER_WIDTH = 280;
const MOBILE_TOPBAR_HEIGHT = 64;

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
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
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

  const desktopNavWidth = desktopCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const navItemsSx = (active: boolean, collapsed: boolean) => ({
    borderRadius: 2.5,
    mb: 0.75,
    px: collapsed ? 1 : 1.5,
    py: 1,
    minHeight: 44,
    justifyContent: collapsed ? "center" : "flex-start",
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
  });

  const sidebarContent = (collapsed: boolean) => (
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
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          gap: 1,
          px: collapsed ? 0.5 : 1.5,
          py: 1.5,
          mb: 1,
        }}
      >
        <Box
          component={Link}
          href={homeHref}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            flexGrow: 1,
            minWidth: 0,
            borderRadius: 3,
            textDecoration: "none",
            transition: "background 200ms",
            "&:hover": { bgcolor: "action.hover" },
          }}
        >
          <Image
            src="/logo.png"
            alt="Logo"
            width={collapsed ? 52 : 140}
            height={collapsed ? 52 : 60}
            style={{ objectFit: "contain" }}
            priority
          />
        </Box>
        {isDesktop && (
          <IconButton
            onClick={() => setDesktopCollapsed((prev) => !prev)}
            size="small"
            sx={{
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
              boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
              ml: collapsed ? 0 : 1,
            }}
          >
            {collapsed ? <ChevronRightRoundedIcon fontSize="small" /> : <ChevronLeftRoundedIcon fontSize="small" />}
          </IconButton>
        )}
        {!isDesktop && (
          <IconButton
            onClick={() => setMobileOpen(false)}
            size="small"
            sx={{
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
              boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
            }}
          >
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        )}
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
              sx={navItemsSx(active, collapsed)}
            >
              <ListItemIcon
                sx={{
                  minWidth: collapsed ? 0 : 36,
                  mr: collapsed ? 0 : 0.5,
                  color: active ? "primary.main" : "text.secondary",
                }}
              >
                {item.icon}
              </ListItemIcon>
              {!collapsed && (
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: "0.85rem",
                    fontWeight: active ? 700 : 500,
                    color: active ? "primary.main" : "text.primary",
                  }}
                />
              )}
            </ListItemButton>
          );
        })}
      </List>

      <Divider sx={{ mx: 1, my: 1 }} />

      {/* Footer controls */}
      <Stack spacing={1} sx={{ px: 1 }}>
        {!collapsed && (
          <Chip
            label={roleLabel}
            color="primary"
            variant="outlined"
            size="small"
            sx={{ fontWeight: 700, alignSelf: "flex-start" }}
          />
        )}
        <Stack
          direction={collapsed ? "column" : "row"}
          alignItems="center"
          justifyContent="space-between"
          spacing={collapsed ? 1 : 0}
        >
          <ThemeModeToggle />
          <Button
            onClick={onLogout}
            disabled={loggingOut}
            color="inherit"
            size="small"
            startIcon={collapsed ? undefined : <LogoutRoundedIcon sx={{ fontSize: 18 }} />}
            sx={{
              fontSize: "0.78rem",
              color: "text.secondary",
              minWidth: collapsed ? 40 : undefined,
              px: collapsed ? 1 : 1.5,
              "&:hover": { color: "error.main" },
            }}
          >
            {collapsed ? <LogoutRoundedIcon sx={{ fontSize: 18 }} /> : loggingOut ? "Logging out…" : "Logout"}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );

  const sidebarBg = (t: typeof theme) =>
    t.palette.mode === "dark"
      ? "linear-gradient(195deg, rgba(15,27,45,0.97), rgba(9,17,31,0.98))"
      : "linear-gradient(195deg, rgba(255,255,255,0.98), rgba(246,249,255,0.97))";

  const sidebarShadow = (t: typeof theme) =>
    t.palette.mode === "dark"
      ? "4px 0 24px rgba(0,0,0,0.35)"
      : "4px 0 24px rgba(37,99,235,0.08)";

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* ── Desktop permanent sidebar ── */}
      {isDesktop && (
        <Box
          component="nav"
          sx={{
            width: desktopNavWidth,
            flexShrink: 0,
            position: "fixed",
            top: 0,
            left: 0,
            bottom: 0,
            zIndex: (t) => t.zIndex.drawer,
            borderRight: "1px solid",
            borderColor: "divider",
            backgroundImage: (t) => sidebarBg(t),
            backdropFilter: "blur(20px)",
            boxShadow: (t) => sidebarShadow(t),
            transition: "width 220ms ease, box-shadow 220ms ease",
            overflowX: "hidden",
          }}
        >
          {sidebarContent(desktopCollapsed)}
        </Box>
      )}

      {/* ── Mobile top bar (hamburger) ── */}
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
          <Toolbar sx={{ minHeight: MOBILE_TOPBAR_HEIGHT, px: 1.5, justifyContent: "space-between", gap: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <IconButton
                onClick={() => setMobileOpen(true)}
                size="medium"
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: "background.paper",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  "&:hover": { bgcolor: "action.hover" },
                }}
                aria-label="Open navigation menu"
              >
                <MenuRoundedIcon />
              </IconButton>
              <Link href={homeHref} style={{ display: "flex", alignItems: "center" }}>
                <Image
                  src="/logo.png"
                  alt="Logo"
                  width={90}
                  height={36}
                  style={{ objectFit: "contain" }}
                  priority
                />
              </Link>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Chip
                label={roleLabel}
                color="primary"
                variant="outlined"
                size="small"
                sx={{ fontWeight: 700, maxWidth: 110 }}
              />
              <ThemeModeToggle />
            </Stack>
          </Toolbar>
        </Box>
      )}

      {/* ── Mobile slide-out drawer ── */}
      {!isDesktop && (
        <Drawer
          anchor="left"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          PaperProps={{
            sx: {
              width: MOBILE_DRAWER_WIDTH,
              backgroundImage: (t) => sidebarBg(t),
              backdropFilter: "blur(20px)",
              boxShadow: (t) => sidebarShadow(t),
              borderRight: "1px solid",
              borderColor: "divider",
            },
          }}
        >
          {sidebarContent(false)}
        </Drawer>
      )}

      {/* ── Main content area ── */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          ml: isDesktop ? `${desktopNavWidth}px` : 0,
          mt: isDesktop ? 0 : `${MOBILE_TOPBAR_HEIGHT}px`,
          minHeight: isDesktop ? "100vh" : `calc(100vh - ${MOBILE_TOPBAR_HEIGHT}px)`,
          overflow: "auto",
          transition: "margin-left 220ms ease",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
 