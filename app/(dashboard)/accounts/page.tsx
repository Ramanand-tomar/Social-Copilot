"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { 
  Plus, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  ChevronRight,
  Shield,
  Zap
} from "lucide-react";
import { toast } from "sonner";
import { platforms, Platform } from "@/lib/social-platforms";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
} from "@/components/ui/dialog";

interface SocialAccount {
  id: string;
  platform: string;
  platformUsername: string;
  platformAccountId: string;
  expiresAt: string | null;
}

export default function AccountsPage() {
  const { user } = useUser();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [plan, setPlan] = useState<string>("free");
  // Server-enforced cap from /api/billing/usage. Initialised to null so
  // we can render a "—" placeholder until the first fetch resolves
  // instead of flashing a wrong number.
  const [maxAccounts, setMaxAccounts] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [accRes, usageRes] = await Promise.all([
        fetch("/api/accounts"),
        fetch("/api/billing/usage")
      ]);

      const accData = await accRes.json();
      const usageData = await usageRes.json();

      setAccounts(accData.accounts || []);
      setPlan(usageData.plan || "free");
      // Read directly from the server response — no client-side plan
      // table. This is the same source the POST /api/accounts/connect
      // route enforces, so the UI cap can never drift from reality.
      const apiLimit = usageData?.limits?.maxSocialAccounts;
      setMaxAccounts(typeof apiLimit === "number" ? apiLimit : null);
    } catch (error) {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDisconnect = async (id: string) => {
    try {
      const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
      if (res.ok) {
        setAccounts(accounts.filter(a => a.id !== id));
        toast.success("Account disconnected successfully");
      } else {
        toast.error("Failed to disconnect account");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setDeletingId(null);
    }
  };

  const handleRefresh = async (id: string) => {
    toast.promise(
      fetch(`/api/accounts/${id}`, { method: "POST" }),
      {
        loading: 'Queuing refresh job...',
        success: 'Refresh job queued successfully',
        error: 'Failed to queue refresh job',
      }
    );
  };

  // Source of truth is the API. Until it loads we treat the limit as
  // "unknown" and disable connect actions to avoid letting a user start
  // an OAuth flow that the server will then reject.
  const isLimitReached = maxAccounts !== null && accounts.length >= maxAccounts;
  const limitDisplay = maxAccounts === null ? "—" : String(maxAccounts);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/5 p-8 rounded-[2.5rem] border border-white/10">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-white tracking-tight">Social Accounts</h1>
          <p className="text-gray-400">Manage your connected platforms and sync permissions.</p>
        </div>
        <div className="flex items-center gap-4 bg-indigo-500/10 px-6 py-4 rounded-3xl border border-indigo-500/20">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="text-sm font-medium text-white">Plan Usage</div>
            <div className="text-xl font-bold text-indigo-400">
              {accounts.length} / {limitDisplay} <span className="text-xs font-normal text-gray-500">accounts</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3 px-2">
          Connected Channels
          <Badge variant="outline" className="rounded-full bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
            {accounts.length} Active
          </Badge>
        </h2>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-white/5 rounded-[2rem] animate-pulse border border-white/10" />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-[3rem] border border-dashed border-white/10">
            <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Plus className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No accounts connected</h3>
            <p className="text-gray-400 mb-8">Start by connecting your first social platform below.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map((account) => (
              <Card key={account.id} className="bg-white/5 border-white/10 rounded-[2rem] overflow-hidden group hover:bg-white/[0.08] transition-all duration-300">
                <CardHeader className="p-8">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <ExternalLink className="w-7 h-7 text-indigo-400" />
                    </div>
                    <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-0 flex items-center gap-1.5 px-3 py-1 text-xs">
                      <CheckCircle2 className="w-3 h-3" />
                      Connected
                    </Badge>
                  </div>
                  <CardTitle className="text-xl text-white capitalize">{account.platform}</CardTitle>
                  <CardDescription className="text-gray-400">@{account.platformUsername}</CardDescription>
                </CardHeader>
                <CardFooter className="bg-white/5 p-6 flex justify-between border-t border-white/5">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleRefresh(account.id)}
                    className="text-gray-400 hover:text-white flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Sync
                  </Button>
                  <Dialog>
                    <DialogTrigger render={<Button variant="ghost" size="sm" className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 flex items-center gap-2" />}>
                      <Trash2 className="w-4 h-4" />
                      Disconnect
                    </DialogTrigger>
                    <DialogContent className="bg-[#0a0a1a] border-white/10 text-white rounded-[2rem]">
                      <DialogHeader>
                        <DialogTitle>Disconnect Account?</DialogTitle>
                        <DialogDescription className="text-gray-400">
                          This will permanently remove the connection and cancel all pending posts for this channel.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter className="mt-6 flex gap-4">
                        <Button variant="outline" className="flex-1 bg-transparent hover:bg-white/5">Cancel</Button>
                        <Button 
                          variant="destructive" 
                          className="flex-1 bg-rose-600 hover:bg-rose-700"
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

      <div className="space-y-8 pt-10">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-2xl font-bold text-white">Add More Accounts</h2>
          {isLimitReached && (
            <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 flex items-center gap-2 px-4 py-2">
              <Zap className="w-3.5 h-3.5 fill-current" />
              Upgrade to Pro for more slots
            </Badge>
          )}
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {(Object.keys(platforms) as Platform[]).map((p) => {
            const platform = platforms[p];
            const isConnected = accounts.some(acc => acc.platform === p);
            
            return (
              <button
                key={p}
                disabled={isConnected || isLimitReached}
                onClick={() => window.location.href = `/api/accounts/connect/${p}`}
                className={`flex flex-col items-center justify-center p-8 rounded-[2rem] border transition-all duration-300 group ${
                  isConnected 
                    ? "bg-emerald-500/5 border-emerald-500/20 cursor-default" 
                    : isLimitReached 
                    ? "bg-white/5 border-white/5 opacity-50 cursor-not-allowed"
                    : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-indigo-500/50 hover:-translate-y-1"
                }`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-colors ${
                  isConnected ? "bg-emerald-500/10" : "bg-white/5 group-hover:bg-indigo-500/10"
                }`}>
                  <Plus className={`w-6 h-6 ${isConnected ? "text-emerald-500" : "text-gray-400 group-hover:text-indigo-400"}`} />
                </div>
                <div className="text-sm font-bold text-white mb-1 capitalize">{platform.name}</div>
                <div className="text-[10px] text-gray-500">{isConnected ? "Connected" : "Available"}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
