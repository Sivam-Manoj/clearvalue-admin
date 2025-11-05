"use client";

import { useEffect, useState } from "react";
import LoginForm from "@/app/components/auth/LoginForm";
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
      {/* Animated gradient orbs */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-rose-200/40 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-rose-300/40 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-rose-100/30 blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />

      {/* Floating particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 h-2 w-2 rounded-full bg-rose-400/20 animate-float" />
        <div className="absolute top-1/3 right-1/4 h-3 w-3 rounded-full bg-rose-300/20 animate-float" style={{ animationDelay: '1s', animationDuration: '4s' }} />
        <div className="absolute bottom-1/4 left-1/3 h-2 w-2 rounded-full bg-rose-500/20 animate-float" style={{ animationDelay: '2s', animationDuration: '5s' }} />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-10 md:py-16">
        {/* Card with staggered animation */}
        <div
          className={`rounded-3xl border border-rose-200/80 bg-white/90 backdrop-blur-xl shadow-2xl shadow-rose-200/60 transition-all duration-700 ease-out ${
            mounted ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-95"
          }`}
        >
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Left: branding */}
            <div
              className={`p-8 md:p-12 border-b md:border-b-0 md:border-r border-rose-200/70 bg-gradient-to-br from-white via-rose-50/50 to-rose-100/30 rounded-t-3xl md:rounded-l-3xl md:rounded-tr-none transition-all duration-700 ease-out delay-100 ${
                mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
              }`}
            >
              {/* Logo with animation */}
              <div className="flex items-center gap-3 group">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 shadow-lg shadow-rose-500/30 ring-2 ring-rose-300/50 flex items-center justify-center text-white font-bold text-lg transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  CV
                </div>
                <div>
                  <div className="text-sm text-gray-500 font-medium">ClearValue</div>
                  <div className="font-bold text-gray-900 text-lg">Admin Console</div>
                </div>
              </div>

              {/* Welcome text */}
              <h1 className="mt-8 text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
                Welcome back
              </h1>
              <p className="mt-3 text-gray-600 text-base leading-relaxed">
                Sign in to access your dashboard and manage your organization with powerful tools.
              </p>

              {/* Features list */}
              <div className="mt-8 space-y-3">
                {[
                  { icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', text: 'Secure authentication' },
                  { icon: 'M13 10V3L4 14h7v7l9-11h-7z', text: 'Lightning-fast performance' },
                  { icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4', text: 'Advanced analytics' },
                ].map((feature, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 transition-all duration-500 ease-out ${
                      mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
                    }`}
                    style={{ transitionDelay: `${300 + idx * 100}ms` }}
                  >
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-rose-100 flex items-center justify-center">
                      <svg className="h-4 w-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d={feature.icon} />
                      </svg>
                    </div>
                    <span className="text-sm text-gray-700 font-medium">{feature.text}</span>
                  </div>
                ))}
              </div>

              {/* Contact card */}
              <div
                className={`mt-8 rounded-2xl border border-rose-200/80 bg-gradient-to-br from-white to-rose-50/50 p-5 shadow-sm hover:shadow-md transition-all duration-300 ${
                  mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
                style={{ transitionDelay: '600ms' }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className="h-5 w-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-sm text-gray-700 leading-relaxed">
                    <span className="font-semibold">Don&apos;t have an admin account?</span>
                    <br />
                    Contact our team at{' '}
                    <a
                      className="text-rose-700 font-semibold underline underline-offset-2 hover:text-rose-800 transition-colors cursor-pointer"
                      href={`mailto:${supportEmail}`}
                    >
                      {supportEmail}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: form */}
            <div
              className={`p-8 md:p-12 flex items-center justify-center bg-white/50 rounded-b-3xl md:rounded-r-3xl md:rounded-bl-none transition-all duration-700 ease-out delay-200 ${
                mounted ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
              }`}
            >
              <LoginForm embedded />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`mt-8 text-center transition-all duration-700 ease-out delay-300 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <p className="text-xs text-gray-500">
            By signing in you agree to ClearValue&apos;s{' '}
            <span className="text-gray-700 hover:text-rose-600 transition-colors cursor-pointer font-medium">Terms of Service</span>
            {' '}and{' '}
            <span className="text-gray-700 hover:text-rose-600 transition-colors cursor-pointer font-medium">Privacy Policy</span>
          </p>
        </div>
      </div>
    </div>
  );
}
