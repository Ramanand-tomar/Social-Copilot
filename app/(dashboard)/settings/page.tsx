"use client";

import { useUser, UserProfile } from "@clerk/nextjs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings as SettingsIcon, ShieldCheck, Mail, User as UserIcon } from "lucide-react";

export default function SettingsPage() {
  const { user, isLoaded } = useUser();

  return (
    <div className="p-8 max-w-[1200px] mx-auto space-y-10 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-indigo-400" />
          Settings
        </h1>
        <p className="text-sm text-zinc-500">
          Manage your profile, security, and preferences.
        </p>
      </div>

      {/* Profile overview */}
      <Card className="bg-white/[0.03] border-white/[0.08] rounded-[2rem] overflow-hidden">
        <CardContent className="p-8">
          {!isLoaded ? (
            <div className="flex items-center gap-6">
              <Skeleton className="w-20 h-20 rounded-full bg-white/[0.06]" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-5 w-48 bg-white/[0.06]" />
                <Skeleton className="h-4 w-64 bg-white/[0.04]" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              {user?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.imageUrl}
                  alt={user.fullName || "User avatar"}
                  className="w-20 h-20 rounded-full border border-white/[0.1] shadow-[0_0_20px_rgba(79,70,229,0.2)]"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
                  <UserIcon className="w-8 h-8 text-indigo-400" />
                </div>
              )}
              <div className="flex-1 space-y-1">
                <h2 className="text-xl font-bold text-white">
                  {user?.fullName || user?.username || "Unnamed user"}
                </h2>
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <Mail className="w-4 h-4 text-zinc-500" />
                  {user?.primaryEmailAddress?.emailAddress || "No email on file"}
                </div>
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold uppercase tracking-widest mt-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified account
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clerk UserProfile — full profile / security / connected accounts */}
      <Card className="bg-white/[0.03] border-white/[0.08] rounded-[2rem] overflow-hidden">
        <CardContent className="p-0 sm:p-6">
          <UserProfile
            appearance={{
              variables: {
                colorBackground: "#0a0a1a",
                colorText: "#f4f4f5",
                colorTextSecondary: "#a1a1aa",
                colorPrimary: "#6366f1",
                colorInputBackground: "rgba(255, 255, 255, 0.03)",
                colorInputText: "#f4f4f5",
                borderRadius: "0.75rem",
              },
              elements: {
                rootBox: "w-full",
                card: "bg-transparent shadow-none border-0",
                navbar: "bg-white/[0.02] border-r border-white/[0.05]",
                headerTitle: "text-white",
                headerSubtitle: "text-zinc-500",
                profileSectionTitleText: "text-white",
                formButtonPrimary:
                  "bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)]",
                formFieldLabel: "text-zinc-400",
              },
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
