"use client";

import { useEffect, useState } from "react";
import LoginForm from "@/components/auth/LoginForm";
import Link from "next/link";

export default function LoginPageView() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(t);
  }, []);

  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@clearvalue.com";

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-white via-rose-50 to-rose-100">
      {/* subtle gradient orbs */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-rose-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-rose-300/40 blur-3xl" />

      <div className="relative max-w-6xl mx-auto px-4 py-10 md:py-16">
        {/* Card */}
        <div
          className={`rounded-3xl border border-rose-200/80 bg-white/80 backdrop-blur shadow-2xl shadow-rose-200/60 transition-all duration-500 ease-out ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Left: branding */}
            <div className="p-6 md:p-10 border-b md:border-b-0 md:border-r border-rose-200/70 bg-gradient-to-br from-white to-rose-50 rounded-t-3xl md:rounded-l-3xl">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-rose-500 shadow-md shadow-rose-200 ring-1 ring-rose-300 flex items-center justify-center text-white font-bold">
                  CV
                </div>
                <div>
                  <div className="text-sm text-gray-500">ClearValue</div>
                  <div className="font-semibold text-gray-900">Admin Console</div>
                </div>
              </div>
              <h1 className="mt-6 text-2xl md:text-3xl font-semibold text-gray-900">Welcome back</h1>
              <p className="mt-2 text-gray-600">
                Sign in to access the dashboard and manage your organization.
              </p>

              {/* Contact / Register */}
              <div className="mt-6 rounded-2xl border border-rose-200 bg-white/70 p-4 shadow-sm">
                <div className="text-sm text-gray-700">
                  Don&apos;t have an admin account?
                  <br className="hidden sm:block" />
                  Please contact our team at
                  {" "}
                  <a
                    className="text-rose-700 underline underline-offset-2 hover:text-rose-800 cursor-pointer"
                    href={`mailto:${supportEmail}`}
                  >
                    {supportEmail}
                  </a>
                  .
                </div>
              </div>
            </div>

            {/* Right: form */}
            <div className="p-6 md:p-10 flex items-center justify-center">
              <LoginForm embedded />
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div className="mt-6 text-center text-xs text-gray-500">
          By signing in you agree to ClearValue&apos;s Terms and Privacy Policy.
        </div>
      </div>
    </div>
  );
}
