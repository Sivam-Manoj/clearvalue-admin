"use client";

import React from "react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  maxWidthClass?: string; // e.g., "max-w-md", "max-w-lg"
};

export default function Modal({ open, onClose, title, children, footer, maxWidthClass = "max-w-lg" }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${maxWidthClass} rounded-2xl border border-rose-200 bg-white/90 backdrop-blur shadow-2xl shadow-rose-100`}>
        <div className="px-5 pt-5 pb-3 border-b border-rose-200/70">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button
              aria-label="Close"
              onClick={onClose}
              className="cursor-pointer inline-flex items-center justify-center h-8 w-8 rounded-xl border border-gray-300 text-gray-600 bg-white hover:bg-gray-50 active:bg-gray-100 shadow-sm"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
        <div className="p-5">
          {children}
        </div>
        {footer ? (
          <div className="px-5 py-4 border-t border-rose-200/70 bg-white/70 flex items-center justify-end gap-2">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
