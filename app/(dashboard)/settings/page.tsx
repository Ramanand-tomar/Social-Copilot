"use client";

import { useEffect, useState } from "react";
import { useUser, UserProfile } from "@clerk/nextjs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings as SettingsIcon, ShieldCheck, Mail, User as UserIcon, Globe, Link2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";

export default function SettingsPage() {
  const { user, isLoaded } = useUser();
  const [timezone, setTimezone] = useState<string>("");
  const [savingTz, setSavingTz] = useState(false);
  const [availableTimezones, setAvailableTimezones] = useState<string[]>([]);

  useEffect(() => {
    let zones: string[] = [];
    try {
      if (typeof Intl !== "undefined" && "supportedValuesOf" in Intl) {
        zones = Intl.supportedValuesOf("timeZone");
      }
    } catch {
      // ignore fallback
    }

    if (!zones || zones.length === 0) {
      zones = [
        "UTC",
        "America/New_York",
        "America/Chicago",
        "America/Denver",
        "America/Los_Angeles",
        "America/Toronto",
        "Europe/London",
        "Europe/Paris",
        "Europe/Berlin",
        "Asia/Tokyo",
        "Asia/Shanghai",
        "Asia/Kolkata",
        "Asia/Calcutta",
        "Australia/Sydney",
      ];
    }

    setAvailableTimezones(zones);

    const loadUserTz = async () => {
      try {
        const res = await fetch("/api/user");
        if (res.ok) {
          const data = await res.json();
          if (data.timezone) {
            setTimezone(data.timezone);
            return;
          }
        }
      } catch {
        // silent
      }
      const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      setTimezone(browserTz);
    };

    loadUserTz();
  }, []);

  const handleSaveTimezone = async () => {
    setSavingTz(true);
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone }),
      });

      if (res.ok) {
        toast.success(`Timezone saved to ${timezone}`);
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to update timezone");
      }
    } catch {
      toast.error("Network error while updating timezone");
    } finally {
      setSavingTz(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto space-y-8 animate-in fade-in duration-500 min-w-0">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <SettingsIcon className="w-7 h-7 text-indigo-400" />
          <span>Settings</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400">
          Manage your user profile, timezone preferences, and account security.
        </p>
      </div>

      {/* Profile & Preferences overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 bg-white/[0.03] border-white/[0.08] rounded-3xl overflow-hidden">
          <CardContent className="p-6 sm:p-8">
            {!isLoaded ? (
              <div className="flex items-center gap-6">
                <Skeleton className="w-16 h-16 rounded-full bg-white/[0.06]" />
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
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border border-white/[0.1] shadow-[0_0_20px_rgba(79,70,229,0.2)] shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0">
                    <UserIcon className="w-8 h-8 text-indigo-400" />
                  </div>
                )}
                <div className="flex-1 space-y-1 min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold text-white truncate">
                    {user?.fullName || user?.username || "Unnamed user"}
                  </h2>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-400 truncate">
                    <Mail className="w-4 h-4 text-zinc-500 shrink-0" />
                    <span className="truncate">{user?.primaryEmailAddress?.emailAddress || "No email on file"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] sm:text-xs text-emerald-400 font-semibold uppercase tracking-widest mt-2">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified account
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/[0.03] border-white/[0.08] rounded-3xl overflow-hidden flex flex-col justify-between">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-400" />
              <span>Timezone Preference</span>
            </h2>
            <p className="text-xs text-zinc-400">
              Scheduled post times render in this timezone.
            </p>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500/50 max-h-48"
              aria-label="Select preferred timezone"
            >
              {availableTimezones.map((tz) => (
                <option key={tz} value={tz} className="bg-[#0a0a1a] text-white">
                  {tz}
                </option>
              ))}
            </select>
            <Button
              onClick={handleSaveTimezone}
              disabled={savingTz}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl h-9 text-xs font-semibold"
            >
              {savingTz ? "Saving..." : "Save Timezone"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Connected Accounts Quick Access */}
      <Card className="bg-white/[0.03] border-white/[0.08] rounded-3xl overflow-hidden">
        <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link2 className="w-5 h-5 text-indigo-400 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-white">Social Media Connections</h3>
              <p className="text-xs text-zinc-400">Connect or manage OAuth integrations across 9 platforms.</p>
            </div>
          </div>
          <Link href="/accounts" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto border-white/10 text-white hover:bg-white/5 rounded-xl h-10 text-xs font-semibold flex items-center gap-2">
              <span>Manage Accounts</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Clerk UserProfile */}
      <Card className="bg-white/[0.03] border-white/[0.08] rounded-3xl overflow-hidden max-w-full">
        <CardContent className="p-0 sm:p-4 max-w-full overflow-x-hidden">
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
                rootBox: "w-full max-w-full overflow-hidden",
                cardBox: "w-full max-w-full shadow-none border-0 bg-transparent",
                card: "bg-transparent shadow-none border-0 max-w-full",
                navbar: "bg-white/[0.02] border-r border-white/[0.05] hidden md:flex",
                navbarMobileMenuRow: "flex md:hidden",
                headerTitle: "text-white text-lg",
                headerSubtitle: "text-zinc-400 text-xs",
                profileSectionTitleText: "text-white text-sm font-bold",
                formButtonPrimary:
                  "bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] text-xs h-9",
                formFieldLabel: "text-zinc-400 text-xs",
              },
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
