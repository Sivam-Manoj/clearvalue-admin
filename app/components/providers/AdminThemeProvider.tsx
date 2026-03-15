"use client";

import {
  CssBaseline,
  GlobalStyles,
  ThemeProvider,
  alpha,
  createTheme,
  type PaletteMode,
} from "@mui/material";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import * as React from "react";

type AdminThemeContextValue = {
  mode: PaletteMode;
  toggleMode: () => void;
  setMode: (mode: PaletteMode) => void;
};

const AdminThemeContext = React.createContext<AdminThemeContextValue | undefined>(undefined);

function buildTheme(mode: PaletteMode) {
  const isDark = mode === "dark";
  const primary = isDark ? "#7dd3fc" : "#2563eb";
  const secondary = isDark ? "#c084fc" : "#7c3aed";
  const backgroundDefault = isDark ? "#07111f" : "#eef4ff";
  const backgroundPaper = isDark ? "#0f1b2d" : "#ffffff";
  const textPrimary = isDark ? "#e6eefc" : "#132238";
  const textSecondary = isDark ? "#93a9c8" : "#52637a";

  return createTheme({
    palette: {
      mode,
      primary: { main: primary },
      secondary: { main: secondary },
      success: { main: isDark ? "#34d399" : "#059669" },
      warning: { main: isDark ? "#fbbf24" : "#d97706" },
      error: { main: isDark ? "#fb7185" : "#dc2626" },
      background: {
        default: backgroundDefault,
        paper: backgroundPaper,
      },
      text: {
        primary: textPrimary,
        secondary: textSecondary,
      },
      divider: isDark ? "rgba(148, 163, 184, 0.18)" : "rgba(148, 163, 184, 0.24)",
    },
    shape: {
      borderRadius: 20,
    },
    typography: {
      fontFamily: "var(--font-geist-sans), Inter, Arial, sans-serif",
      h1: { fontWeight: 800, letterSpacing: "-0.03em" },
      h2: { fontWeight: 800, letterSpacing: "-0.025em" },
      h3: { fontWeight: 700, letterSpacing: "-0.02em" },
      button: { fontWeight: 700, textTransform: "none" },
    },
    shadows: [
      "none",
      "0px 8px 20px rgba(15,23,42,0.08)",
      "0px 10px 24px rgba(15,23,42,0.10)",
      "0px 12px 28px rgba(15,23,42,0.12)",
      "0px 16px 36px rgba(15,23,42,0.14)",
      "0px 20px 44px rgba(15,23,42,0.16)",
      "0px 24px 52px rgba(15,23,42,0.18)",
      "0px 28px 60px rgba(15,23,42,0.20)",
      "0px 32px 68px rgba(15,23,42,0.22)",
      "0px 36px 76px rgba(15,23,42,0.24)",
      "0px 40px 84px rgba(15,23,42,0.26)",
      "0px 44px 92px rgba(15,23,42,0.28)",
      "0px 48px 100px rgba(15,23,42,0.30)",
      "0px 52px 108px rgba(15,23,42,0.32)",
      "0px 56px 116px rgba(15,23,42,0.34)",
      "0px 60px 124px rgba(15,23,42,0.36)",
      "0px 64px 132px rgba(15,23,42,0.38)",
      "0px 68px 140px rgba(15,23,42,0.40)",
      "0px 72px 148px rgba(15,23,42,0.42)",
      "0px 76px 156px rgba(15,23,42,0.44)",
      "0px 80px 164px rgba(15,23,42,0.46)",
      "0px 84px 172px rgba(15,23,42,0.48)",
      "0px 88px 180px rgba(15,23,42,0.50)",
      "0px 92px 188px rgba(15,23,42,0.52)",
      "0px 96px 196px rgba(15,23,42,0.54)",
    ],
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          "*, *::before, *::after": {
            boxSizing: "border-box",
          },
          html: {
            colorScheme: mode,
          },
          body: {
            minHeight: "100vh",
            background: isDark
              ? "radial-gradient(circle at top left, rgba(56,189,248,0.16), transparent 28%), radial-gradient(circle at top right, rgba(168,85,247,0.14), transparent 24%), linear-gradient(180deg, #07111f 0%, #081426 46%, #0c1930 100%)"
              : "radial-gradient(circle at top left, rgba(37,99,235,0.12), transparent 26%), radial-gradient(circle at top right, rgba(168,85,247,0.10), transparent 20%), linear-gradient(180deg, #f7faff 0%, #eef4ff 52%, #e6eefc 100%)",
            color: textPrimary,
          },
          a: {
            color: "inherit",
            textDecoration: "none",
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: isDark
              ? "linear-gradient(135deg, rgba(15,23,42,0.90), rgba(13,27,45,0.76))"
              : "linear-gradient(135deg, rgba(255,255,255,0.92), rgba(241,245,255,0.84))",
            backdropFilter: "blur(20px)",
            boxShadow: isDark
              ? "0 20px 50px rgba(2,6,23,0.45)"
              : "0 20px 50px rgba(37,99,235,0.14)",
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundImage: isDark
              ? "linear-gradient(180deg, rgba(9,16,28,0.96), rgba(15,27,45,0.94))"
              : "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(242,247,255,0.96))",
            backdropFilter: "blur(18px)",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: isDark
              ? "linear-gradient(180deg, rgba(15,27,45,0.92), rgba(9,17,31,0.94))"
              : "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(246,249,255,0.96))",
            backdropFilter: "blur(18px)",
            border: `1px solid ${alpha(isDark ? "#93c5fd" : "#c7d2fe", isDark ? 0.10 : 0.28)}`,
            boxShadow: isDark
              ? "0 18px 48px rgba(2,6,23,0.42), inset 0 1px 0 rgba(255,255,255,0.03)"
              : "0 18px 48px rgba(37,99,235,0.10), inset 0 1px 0 rgba(255,255,255,0.9)",
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 24,
            transform: "translateZ(0)",
            transition: "transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease",
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: 16,
            paddingInline: 18,
            minHeight: 42,
          },
          containedPrimary: {
            backgroundImage: isDark
              ? "linear-gradient(135deg, #38bdf8, #2563eb)"
              : "linear-gradient(135deg, #2563eb, #7c3aed)",
            boxShadow: isDark
              ? "0 18px 36px rgba(37,99,235,0.30)"
              : "0 18px 36px rgba(37,99,235,0.22)",
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 999,
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          variant: "outlined",
        },
      },
    },
  });
}

export function useAdminTheme() {
  const context = React.useContext(AdminThemeContext);
  if (!context) {
    throw new Error("useAdminTheme must be used inside AdminThemeProvider");
  }
  return context;
}

export default function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = React.useState<PaletteMode>("light");
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const saved = window.localStorage.getItem("admin-theme-mode");
    if (saved === "light" || saved === "dark") {
      setMode(saved);
    } else {
      setMode(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    }
    setReady(true);
  }, []);

  React.useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem("admin-theme-mode", mode);
    document.documentElement.dataset.theme = mode;
  }, [mode, ready]);

  const theme = React.useMemo(() => buildTheme(mode), [mode]);
  const value = React.useMemo<AdminThemeContextValue>(() => ({
    mode,
    setMode,
    toggleMode: () => setMode((prev) => (prev === "light" ? "dark" : "light")),
  }), [mode]);

  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
      <AdminThemeContext.Provider value={value}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <GlobalStyles
            styles={{
              ":root": {
                "--admin-surface": theme.palette.background.paper,
                "--admin-surface-muted": alpha(theme.palette.background.paper, mode === "dark" ? 0.72 : 0.84),
                "--admin-border": alpha(theme.palette.divider, 0.9),
                "--admin-text": theme.palette.text.primary,
                "--admin-text-muted": theme.palette.text.secondary,
                "--admin-primary": theme.palette.primary.main,
                "--admin-accent": theme.palette.secondary.main,
              },
            }}
          />
          {children}
        </ThemeProvider>
      </AdminThemeContext.Provider>
    </AppRouterCacheProvider>
  );
}
