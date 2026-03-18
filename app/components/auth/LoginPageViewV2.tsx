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
import Image from "next/image";
import Link from "next/link";
import LoginFormV2 from "@/app/components/auth/LoginFormV2";
import ThemeModeToggle from "@/app/components/common/ThemeModeToggle";

const features = [
  { icon: <SecurityRoundedIcon fontSize="small" />, text: "Secure authentication and session handling" },
  { icon: <SpeedRoundedIcon fontSize="small" />, text: "Fast access to reporting, CRM, and approvals" },
  { icon: <AutoAwesomeRoundedIcon fontSize="small" />, text: "Responsive 3D-inspired UI with dark and light themes" },
];

export default function LoginPageViewV2() {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@clearvalue.com";

  return (
    <Box sx={{ minHeight: "100vh", position: "relative", overflow: "hidden", py: { xs: 3, md: 7 } }}>
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(circle at 10% 20%, rgba(37,99,235,0.2), transparent 20%), radial-gradient(circle at 92% 10%, rgba(124,58,237,0.2), transparent 22%), radial-gradient(circle at 50% 86%, rgba(16,185,129,0.16), transparent 20%), linear-gradient(165deg, rgba(255,255,255,0.9), rgba(248,250,252,0.95))",
        }}
      />
      <Container maxWidth="lg" sx={{ position: "relative", px: { xs: 2, md: 3 } }}>
        <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
          <ThemeModeToggle />
        </Stack>

        <Card
          sx={{
            position: "relative",
            borderRadius: { xs: 4, md: 6 },
            overflow: "hidden",
            border: "1px solid",
            borderColor: alpha("#FFFFFF", 0.65),
            boxShadow: "0 30px 70px rgba(15,23,42,0.14), 0 10px 24px rgba(37,99,235,0.12)",
            bgcolor: alpha("#FFFFFF", 0.94),
            backdropFilter: "blur(10px)",
            "&::before": {
              content: '""',
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background:
                "linear-gradient(120deg, rgba(59,130,246,0.08), rgba(124,58,237,0.06) 32%, rgba(255,255,255,0) 60%)",
              zIndex: 0,
            },
          }}
        >
          <Grid container>
            <Grid size={{ xs: 12, md: 6 }}>
              <CardContent sx={{ p: { xs: 3, md: 5 }, height: "100%", position: "relative", zIndex: 1 }}>
                <Stack spacing={3.5} justifyContent="space-between" sx={{ height: "100%" }}>
                  <Box>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box
                        sx={{
                          borderRadius: 3,
                          px: { xs: 1.15, sm: 1.3 },
                          py: { xs: 0.75, sm: 0.9 },
                          display: "grid",
                          placeItems: "center",
                          bgcolor: alpha("#FFFFFF", 0.9),
                          border: "1px solid",
                          borderColor: alpha("#CBD5E1", 0.85),
                          boxShadow: "0 14px 26px rgba(15,23,42,0.12), inset 0 1px 0 rgba(255,255,255,0.9)",
                        }}
                      >
                        <Image
                          src="/logo.png"
                          alt="ClearValue"
                          width={132}
                          height={48}
                          style={{ width: "100%", height: "auto", objectFit: "contain" }}
                          priority
                        />
                      </Box>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: -0.2 }}>
                          Admin Console
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 0.35 }}>
                          Professional operations hub
                        </Typography>
                      </Box>
                    </Stack>

                    <Typography
                      variant="h2"
                      sx={{ mt: 4, fontSize: { xs: "2.2rem", md: "3.35rem" }, lineHeight: { xs: 1.12, md: 1.06 }, letterSpacing: -1.2 }}
                    >
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
                      bgcolor: alpha("#2563eb", 0.09),
                      border: "1px solid",
                      borderColor: alpha("#93C5FD", 0.55),
                      boxShadow: "0 10px 20px rgba(59,130,246,0.12)",
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
              <CardContent
                sx={{
                  p: { xs: 3, md: 5 },
                  display: "grid",
                  placeItems: "center",
                  minHeight: "100%",
                  bgcolor: alpha("#F8FAFC", 0.72),
                  borderLeft: { md: `1px solid ${alpha("#E2E8F0", 0.8)}` },
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <LoginFormV2 embedded />
              </CardContent>
            </Grid>
          </Grid>
        </Card>

        <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center", mt: 2.5 }}>
          By signing in you agree to ClearValue&apos;s <MuiLink component={Link} href="#" underline="hover">Terms of Service</MuiLink> and <MuiLink component={Link} href="#" underline="hover">Privacy Policy</MuiLink>.
        </Typography>
      </Container>
    </Box>
  );
}
