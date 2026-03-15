"use client";

import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";
import SpeedRoundedIcon from "@mui/icons-material/SpeedRounded";
import {
  alpha,
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  Link as MuiLink,
  Stack,
  Typography,
} from "@mui/material";
import Link from "next/link";
import LoginFormV2 from "@/app/components/auth/LoginFormV2";
import ThemeModeToggle from "@/app/components/common/ThemeModeToggle";

const features = [
  { icon: <SecurityRoundedIcon fontSize="small" />, text: "Secure authentication and session handling" },
  { icon: <SpeedRoundedIcon fontSize="small" />, text: "Fast access to reporting, CRM, and approvals" },
  { icon: <AutoAwesomeRoundedIcon fontSize="small" />, text: "Responsive 3D-inspired UI with dark and light themes" },
];

export default function LoginPageViewV2() {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@assetinsightvaluation.com";

  return (
    <Box sx={{ minHeight: "100vh", position: "relative", overflow: "hidden", py: { xs: 4, md: 8 } }}>
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: "radial-gradient(circle at 10% 20%, rgba(37,99,235,0.16), transparent 18%), radial-gradient(circle at 90% 12%, rgba(124,58,237,0.16), transparent 18%), radial-gradient(circle at 50% 82%, rgba(16,185,129,0.12), transparent 16%)",
        }}
      />
      <Container maxWidth="lg" sx={{ position: "relative", px: { xs: 2, md: 3 } }}>
        <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
          <ThemeModeToggle />
        </Stack>

        <Card sx={{ borderRadius: { xs: 4, md: 6 }, overflow: "hidden" }}>
          <Grid container>
            <Grid size={{ xs: 12, md: 6 }}>
              <CardContent sx={{ p: { xs: 3, md: 5 }, height: "100%" }}>
                <Stack spacing={3.5} justifyContent="space-between" sx={{ height: "100%" }}>
                  <Box>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box
                        sx={{
                          width: 52,
                          height: 52,
                          borderRadius: 4,
                          display: "grid",
                          placeItems: "center",
                          color: "common.white",
                          fontWeight: 800,
                          background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
                          boxShadow: "0 18px 36px rgba(37,99,235,0.24)",
                        }}
                      >
                        CV
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Asset Insight
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                          Admin Console
                        </Typography>
                      </Box>
                    </Stack>

                    <Typography variant="h2" sx={{ mt: 4, fontSize: { xs: "2.3rem", md: "3.4rem" } }}>
                      Modern admin operations, rebuilt for clarity.
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mt: 2, maxWidth: 520 }}>
                      Access a redesigned control center with responsive layouts, stronger visual hierarchy, and live light or dark theme switching.
                    </Typography>
                  </Box>

                  <Stack spacing={1.5}>
                    {features.map((feature) => (
                      <Stack key={feature.text} direction="row" spacing={1.25} alignItems="center">
                        <Chip icon={feature.icon} label={feature.text} variant="outlined" sx={{ justifyContent: "flex-start", width: "100%", height: "auto", py: 0.75 }} />
                      </Stack>
                    ))}
                  </Stack>

                  <Box
                    sx={{
                      borderRadius: 4,
                      p: 2.25,
                      bgcolor: alpha("#2563eb", 0.08),
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <DarkModeRoundedIcon color="primary" />
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                          Need access?
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Contact <MuiLink component="a" href={`mailto:${supportEmail}`} underline="hover">{supportEmail}</MuiLink> to request an admin account.
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                </Stack>
              </CardContent>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <CardContent sx={{ p: { xs: 3, md: 5 }, display: "grid", placeItems: "center", minHeight: "100%" }}>
                <LoginFormV2 embedded />
              </CardContent>
            </Grid>
          </Grid>
        </Card>

        <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center", mt: 2.5 }}>
          By signing in you agree to Asset Insight&apos;s <MuiLink component={Link} href="#" underline="hover">Terms of Service</MuiLink> and <MuiLink component={Link} href="#" underline="hover">Privacy Policy</MuiLink>.
        </Typography>
      </Container>
    </Box>
  );
}
