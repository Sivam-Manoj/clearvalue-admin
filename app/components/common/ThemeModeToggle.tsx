"use client";

import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import { IconButton, Tooltip } from "@mui/material";
import { useAdminTheme } from "@/app/components/providers/AdminThemeProvider";

export default function ThemeModeToggle() {
  const { mode, toggleMode } = useAdminTheme();

  return (
    <Tooltip title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
      <IconButton
        onClick={toggleMode}
        color="primary"
        sx={{
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          boxShadow: 2,
        }}
      >
        {mode === "dark" ? <LightModeRoundedIcon /> : <DarkModeRoundedIcon />}
      </IconButton>
    </Tooltip>
  );
}
