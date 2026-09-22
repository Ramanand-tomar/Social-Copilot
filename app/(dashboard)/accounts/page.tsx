"use client";

import { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  ExternalLink,
  Shield,
  Zap,
  Lock
} from "lucide-react";
import { toast } from "sonner";
import { platforms, Platform } from "@/lib/social-platforms";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

interface SocialAccount {
  id: string;
  platform: string;
  platformUsername: string;
  platformAccountId: string;
  displayName?: string;
  avatarUrl?: string;
  expiresAt: string | null;
}

interface PlatformState {
  id: Platform;
  name: string;
  configured: boolean;
  publishable: boolean;
  available: boolean;
  connected: boolean;
  limitReached: boolean;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [platformStates, setPlatformStates] = useState<Record<string, PlatformState>>({});
  const [loading, setLoading] = useState(true);
  const [maxAccounts, setMaxAccounts] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [accRes, platRes] = await Promise.all([
        fetch("/api/accounts"),
        fetch("/api/accounts/platforms"),
      ]);

      const accData = await accRes.json();
      const platData = await platRes.json();

      setAccounts(accData.accounts || []);

      if (platData?.platforms && Array.isArray(platData.platforms)) {
        const stateMap: Record<string, PlatformState> = {};
        for (const p of platData.platforms) {
          stateMap[p.id] = p;
        }
        setPlatformStates(stateMap);
      }

      if (typeof platData?.maxAccounts === "number") {
        setMaxAccounts(platData.maxAccounts);
      }
    } catch {
      toast.error("Failed to load account settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Parse URL query parameters for OAuth status messages
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const error = params.get("error");
      const success = params.get("success");

      if (error) {
        const errorMessages: Record<string, string> = {
          connect_failed: "Failed to initiate connection. Please try again.",
          callback_failed: "OAuth callback failed. State token invalid or expired.",
          account_limit: "You have reached the social accounts limit for your plan.",
          profile_fetch_failed: "Unable to retrieve account details from provider.",
          access_denied: "Access request was declined on provider.",
          platform_not_configured: "This platform is not yet configured for authentication.",
        };
        toast.error(errorMessages[error] || `Connection failed (${error})`);
        window.history.replaceState({}, "", "/accounts");
      } else if (success) {
        toast.success("Social account connected successfully!");
        window.history.replaceState({}, "", "/accounts");
      }
    }
  }, []);

  const handleDisconnect = async (id: string) => {
    try {
      const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
      if (res.ok) {
        setAccounts((prev) => prev.filter((a) => a.id !== id));
        toast.success("Account disconnected successfully");
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to disconnect account");
      }
    } catch {
      toast.error("An error occurred while disconnecting");
    }
  };

  const handleSync = async (id: string) => {
    try {
      const res = await fetch(`/api/accounts/${id}`, { method: "POST" });
      if (res.ok) {
        toast.success("Account status synced successfully");
      } else {
        toast.error("Failed to sync account status");
      }
    } catch {
      toast.error("Network error during sync");
    }
  };

  const isLimitReached = maxAccounts !== null && accounts.length >= maxAccounts;
  const limitDisplay = maxAccounts === null ? "—" : String(maxAccounts);

  return (
    <div className="space-y-8 animate-in fade-in duration-300 min-w-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/5 p-6 sm:p-8 rounded-3xl border border-white/10">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Social Accounts</h1>
          <p className="text-xs sm:text-sm text-zinc-400">Manage connected platform accounts and permissions.</p>
        </div>
        <div className="flex items-center gap-4 bg-indigo-500/10 px-5 py-3 rounded-2xl border border-indigo-500/20 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="text-xs font-medium text-white">Plan Connections</div>
            <div className="text-lg font-bold text-indigo-400">
              {accounts.length} / {limitDisplay} <span className="text-xs font-normal text-zinc-500">accounts</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-3">
          <span>Connected Channels</span>
          <Badge variant="outline" className="rounded-full bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs px-2.5 py-0.5">
            {accounts.length} Active
          </Badge>
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 bg-white/5 rounded-3xl animate-pulse border border-white/10" />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-16 bg-white/5 rounded-3xl border border-dashed border-white/10 p-6">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-zinc-500" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">No accounts connected</h3>
            <p className="text-xs text-zinc-400 mb-6">Select an available platform below to connect your first channel.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map((account) => (
              <Card key={account.id} className="bg-white/5 border-white/10 rounded-3xl overflow-hidden group hover:bg-white/[0.08] transition-all">
                <CardHeader className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <ExternalLink className="w-6 h-6 text-indigo-400" />
                    </div>
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 flex items-center gap-1 text-xs px-2.5 py-0.5">
                      <CheckCircle2 className="w-3 h-3" />
                      Connected
                    </Badge>
                  </div>
                  <CardTitle className="text-lg text-white capitalize">{account.platform}</CardTitle>
                  <CardDescription className="text-zinc-400 text-xs">
                    {account.displayName || `@${account.platformUsername}`}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="bg-white/5 p-4 flex justify-between border-t border-white/5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSync(account.id)}
                    className="text-zinc-400 hover:text-white flex items-center gap-1.5 text-xs rounded-xl h-8"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Sync</span>
                  </Button>
                  <Dialog>
                    <DialogTrigger render={
                      <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-1.5 text-xs rounded-xl h-8">
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Disconnect</span>
                      </Button>
                    } />
                    <DialogContent className="bg-[#0f0f23] border-white/10 text-white rounded-3xl p-6 sm:p-8">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Disconnect Account?</DialogTitle>
                        <DialogDescription className="text-zinc-400 text-xs leading-relaxed pt-2">
                          This will remove the connection for <span className="text-white font-semibold">{account.displayName || `@${account.platformUsername}`}</span>. Scheduled posts targeting this account will fail unless updated.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter className="mt-6 flex flex-row gap-3">
                        <DialogClose render={
                          <Button variant="ghost" className="flex-1 text-zinc-400 hover:text-white rounded-xl h-10 text-xs">
                            Cancel
                          </Button>
                        } />
                        <Button
                          variant="destructive"
                          className="flex-1 bg-red-600 hover:bg-red-500 text-white rounded-xl h-10 text-xs font-semibold"
                          onClick={() => handleDisconnect(account.id)}
                        >
                          Confirm Disconnect
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-6 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Add Social Channels</h2>
          {isLimitReached && (
            <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 flex items-center gap-1.5 px-3 py-1 text-xs">
              <Zap className="w-3.5 h-3.5 fill-current" />
              Upgrade to Pro for more channels
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
          {(Object.keys(platforms) as Platform[]).map((p) => {
            const platformConfig = platforms[p];
            const pState = platformStates[p];
            const isAvailable = pState ? pState.available : false;
            const isConnected = accounts.some((acc) => acc.platform === p);

            return (
              <button
                key={p}
                disabled={!isAvailable || isConnected || isLimitReached}
                onClick={() => (window.location.href = `/api/accounts/connect/${p}`)}
                className={`flex flex-col items-center justify-center p-6 rounded-3xl border transition-all text-center group ${
                  isConnected
                    ? "bg-emerald-500/5 border-emerald-500/20 cursor-default"
                    : !isAvailable
                    ? "bg-white/[0.02] border-white/[0.05] opacity-50 cursor-not-allowed"
                    : isLimitReached
                    ? "bg-white/5 border-white/5 opacity-60 cursor-not-allowed"
                    : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-indigo-500/50 hover:-translate-y-0.5 active:scale-95"
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition-colors ${
                    isConnected
                      ? "bg-emerald-500/10"
                      : !isAvailable
                      ? "bg-white/5 text-zinc-600"
                      : "bg-white/5 group-hover:bg-indigo-500/10"
                  }`}
                >
                  {!isAvailable ? (
                    <Lock className="w-5 h-5 text-zinc-500" />
                  ) : (
                    <Plus className={`w-6 h-6 ${isConnected ? "text-emerald-400" : "text-zinc-400 group-hover:text-indigo-400"}`} />
                  )}
                </div>
                <div className="text-xs sm:text-sm font-bold text-white mb-1 capitalize">{platformConfig.name}</div>
                <div className="text-[10px] text-zinc-500 font-semibold">
                  {isConnected ? "Connected" : !isAvailable ? "Coming Soon" : "Connect"}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
