"use client";

import { SignIn } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";

export default function Page() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a0a1a] relative overflow-hidden p-4">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/15 blur-[120px] rounded-full -z-10" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600/15 blur-[120px] rounded-full -z-10" />

      <noscript>
        <p className="text-white">
          JavaScript is required to sign in. Please enable it and refresh.
        </p>
      </noscript>

      {/* CSS grid stacks the fallback and Clerk's <SignIn /> in the same
          cell. The fallback shows immediately on first paint; Clerk's
          widget mounts on top once its JS bundle and frontend API are
          reachable. If Clerk's API is blocked (CORS, unallowed origin),
          the user still sees a clear next step instead of a black screen. */}
      <div className="relative grid place-items-center w-full max-w-md">
        {/* Fallback layer */}
        <div className="row-start-1 col-start-1 w-full rounded-3xl border border-white/10 bg-white/[0.03] p-10 backdrop-blur shadow-2xl text-center pointer-events-none">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-indigo-400" />
          <h1 className="text-2xl font-bold text-white mb-2">Loading sign-in…</h1>
          <p className="text-sm text-zinc-400">
            If this screen stays empty for more than a few seconds, your
            current host isn&apos;t allowed by Clerk. Add it under{" "}
            <span className="font-mono text-indigo-300">
              Clerk Dashboard → Domains
            </span>{" "}
            and reload.
          </p>
        </div>

        {/* Clerk SignIn — mounts in the same grid cell, on top of the
            fallback. */}
        <div className="row-start-1 col-start-1 w-full">
          <SignIn
            appearance={{
              variables: {
                colorPrimary: "#6366f1",
                colorBackground: "#0a0a1a",
                colorText: "#ffffff",
                colorTextSecondary: "#a1a1aa",
                colorInputBackground: "rgba(255,255,255,0.05)",
                colorInputText: "#ffffff",
                colorDanger: "#f43f5e",
                colorSuccess: "#10b981",
                borderRadius: "1rem",
              },
              elements: {
                rootBox: "w-full",
                card: "bg-[#0a0a1a]/95 border border-white/10 backdrop-blur shadow-2xl",
                headerTitle: "text-white",
                headerSubtitle: "text-zinc-400",
                socialButtonsBlockButton:
                  "bg-white/5 border border-white/10 text-white hover:bg-white/10",
                dividerLine: "bg-white/10",
                dividerText: "text-zinc-500",
                formFieldLabel: "text-zinc-300",
                formFieldInput:
                  "bg-white/5 border border-white/10 text-white placeholder:text-zinc-600",
                formButtonPrimary:
                  "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-600/30",
                footerActionLink: "text-indigo-400 hover:text-indigo-300",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
