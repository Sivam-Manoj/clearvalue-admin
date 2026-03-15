"use client";

import React from "react";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
} from "@mui/material";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  maxWidthClass?: string; // e.g., "max-w-md", "max-w-lg"
};

const maxWidthMap: Record<string, number> = {
  "max-w-md": 448,
  "max-w-lg": 512,
  "max-w-xl": 576,
  "max-w-2xl": 672,
  "max-w-3xl": 768,
  "max-w-4xl": 896,
  "max-w-5xl": 1024,
  "max-w-6xl": 1152,
  "max-w-7xl": 1280,
};

export default function Modal({ open, onClose, title, children, footer, maxWidthClass = "max-w-lg" }: ModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={false}
      PaperProps={{
        sx: {
          width: "100%",
          maxWidth: maxWidthMap[maxWidthClass] || maxWidthMap["max-w-lg"],
          borderRadius: 4,
        },
      }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, pr: 1.5 }}>
        <span>{title}</span>
        <IconButton aria-label="Close" onClick={onClose}>
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>{children}</DialogContent>
      {footer ? <DialogActions sx={{ px: 3, py: 2 }}>{footer}</DialogActions> : null}
    </Dialog>
  );
}
