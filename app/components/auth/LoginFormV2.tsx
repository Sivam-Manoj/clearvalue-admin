"use client";

import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import MailRoundedIcon from "@mui/icons-material/MailRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { type FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginFormV2({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/reports";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Login failed");
      }
      router.push(next);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to login");
    } finally {
      setLoading(false);
    }
  }

  const form = (
    <Box component="form" onSubmit={onSubmit} sx={{ width: "100%", maxWidth: 420 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Sign in
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
            Use your admin credentials to access reports, users, approvals, and CRM operations.
          </Typography>
        </Box>

        <Stack spacing={2.25}>
          <TextField
            type="email"
            label="Email Address"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={loading}
            placeholder="admin@assetinsightvaluation.com"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <MailRoundedIcon color="primary" fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            type={showPassword ? "text" : "password"}
            label="Password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={loading}
            placeholder="••••••••"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockRoundedIcon color="primary" fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    edge="end"
                    onClick={() => setShowPassword((value) => !value)}
                    disabled={loading}
                  >
                    {showPassword ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Stack>

        {error ? <Alert severity="error">{error}</Alert> : null}

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={loading}
          endIcon={loading ? <CircularProgress size={18} color="inherit" /> : <ArrowForwardRoundedIcon />}
          sx={{ minHeight: 52 }}
        >
          {loading ? "Signing in..." : "Sign in to Dashboard"}
        </Button>
      </Stack>
    </Box>
  );

  if (embedded) return form;

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", px: 2 }}>
      {form}
    </Box>
  );
}
