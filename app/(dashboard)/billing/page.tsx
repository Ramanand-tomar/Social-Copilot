"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  CreditCard,
  Zap,
  Sparkles,
  MessageSquare,
  HardDrive,
  Users,
  Loader2,
  ExternalLink,
  ShieldCheck,
  History,
  Activity,
  AlertTriangle,
  RefreshCcw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function BillingPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchUsage = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/usage");
      if (!res.ok) throw new Error("Failed to fetch usage data");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Failed to load billing information");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
        <p className="text-zinc-500 text-sm italic">Synchronizing with Clerk Billing...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4 text-center">
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
          <AlertTriangle className="h-8 w-8 text-rose-400" />
        </div>
        <div className="space-y-1">
          <p className="text-lg font-bold text-white">Unable to load billing data</p>
          <p className="text-sm text-zinc-500 max-w-sm">
            We couldn&apos;t reach the usage endpoint. Check your connection and try again.
          </p>
        </div>
        <Button
          onClick={fetchUsage}
          className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-6 h-10 flex items-center gap-2"
        >
          <RefreshCcw className="w-4 h-4" />
          <span>Retry</span>
        </Button>
      </div>
    );
  }

  const { plan, limits, usage } = data;

  const pricingPlans = [
    {
      name: "Free",
      id: "free",
      price: "$0",
      description: "Perfect for testing the waters and personal growth.",
      features: [
        "2 Social Accounts",
        "5 Scheduled Posts",
        "1 Auto-Reply Rule",
        "500 MB Media Storage",
        "10 AI Captions /mo",
      ],
      current: plan === "free",
    },
    {
      name: "Pro",
      id: "pro",
      price: "$29",
      description: "For serious creators and growing brands.",
      features: [
        "10 Social Accounts",
        "100 Scheduled Posts",
        "10 Auto-Reply Rules",
        "10 GB Media Storage",
        "500 AI Captions /mo",
      ],
      current: plan === "pro",
      popular: true,
    },
    {
      name: "Business",
      id: "business",
      price: "$99",
      description: "High capacity for agencies and active teams.",
      features: [
        "100 Social Accounts",
        "9,999 Scheduled Posts",
        "9,999 Auto-Reply Rules",
        "100 GB Media Storage",
        "9,999 AI Captions /mo",
      ],
      current: plan === "business",
    },
  ];

  const usageMeters = [
    { label: "Connected Accounts", used: usage.accounts, limit: limits.maxSocialAccounts, icon: Users },
    { label: "Scheduled Posts", used: usage.posts, limit: limits.maxScheduledPosts, icon: CreditCard },
    { label: "Auto-Reply Rules", used: usage.rules, limit: limits.maxAutoReplyRules, icon: MessageSquare },
    { label: "AI Captions", used: usage.aiCaptions, limit: limits.aiCaptionsPerMonth, icon: Sparkles },
    { label: "Media Storage", used: usage.storageMB, limit: limits.maxStorageMB, icon: HardDrive, unit: "MB" },
  ];

  return (
    <div className="flex-1 min-h-screen bg-[#0a0a1a] p-4 sm:p-6 lg:p-10 min-w-0">
      <div className="max-w-[1200px] mx-auto space-y-10 min-w-0">
        
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <CreditCard className="w-7 h-7 text-indigo-400" />
            <span>Billing & Subscription</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            View active plan quotas, current usage metrics, and upgrade options.
          </p>
        </div>

        {/* Current Plan Banner */}
        <Card className="bg-[#0f0f23] border-white/10 overflow-hidden relative rounded-3xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] -z-10" />
          <CardHeader className="p-6 sm:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-2 min-w-0">
                <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 mb-2">
                  Active Subscription
                </Badge>
                <CardTitle className="text-3xl sm:text-4xl font-black text-white capitalize flex items-center gap-3">
                  <span>{plan} Plan</span>
                  <Zap className="w-6 h-6 text-indigo-400 fill-indigo-400 shrink-0" />
                </CardTitle>
                <CardDescription className="text-zinc-400 text-xs sm:text-sm max-w-md">
                  Manage your subscription, payment methods, and invoices securely through Clerk Billing.
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto shrink-0">
                <Link
                  href="/settings"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "bg-white/5 border-white/10 h-11 px-6 rounded-2xl hover:bg-white/10 text-white font-semibold text-xs sm:text-sm min-h-11 w-full sm:w-auto justify-center",
                  )}
                >
                  Manage Billing
                </Link>
                <a
                  href="#compare-plans"
                  className={cn(
                    buttonVariants(),
                    "bg-indigo-600 hover:bg-indigo-500 text-white h-11 px-6 rounded-2xl shadow-[0_0_15px_rgba(79,70,229,0.3)] font-semibold text-xs sm:text-sm min-h-11 w-full sm:w-auto justify-center",
                  )}
                >
                  Upgrade Now
                </a>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Usage Grid */}
        <div className="space-y-4">
          <h2 className="text-base sm:text-lg font-semibold text-zinc-200 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            <span>Plan Usage</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {usageMeters.map((meter) => {
              const percentage = Math.min(Math.round((meter.used / meter.limit) * 100), 100);
              const formattedUnit = meter.unit ? ` ${meter.unit}` : "";
              return (
                <Card key={meter.label} className="bg-white/5 border-white/10 rounded-2xl">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <meter.icon className="w-4 h-4 text-zinc-400 shrink-0" />
                        <span className="text-xs font-medium text-zinc-200">{meter.label}</span>
                      </div>
                      <span className="text-[11px] font-bold text-zinc-400 font-mono">
                        {meter.used}{formattedUnit} / {meter.limit}{formattedUnit}
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2 bg-white/10" />
                    <p className="text-[10px] text-zinc-400 text-right">
                      {percentage}% consumed
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Comparison Cards */}
        <div id="compare-plans" className="space-y-8 pt-8 border-t border-white/10 scroll-mt-24">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Compare Plans</h2>
            <p className="text-zinc-400 text-xs sm:text-sm">Find the perfect plan for your social media strategy.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {pricingPlans.map((p) => (
              <Card key={p.id} className={cn(
                "bg-[#0f0f23] border-white/10 flex flex-col relative transition-all duration-300 rounded-3xl",
                p.popular && "border-indigo-500/50 shadow-[0_0_40px_rgba(79,70,229,0.15)]",
                p.current && "ring-2 ring-emerald-500/40"
              )}>
                {p.popular && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-600 text-[10px] font-bold text-white px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                    Most Popular
                  </div>
                )}
                <CardHeader className="space-y-3 p-6 sm:p-8">
                  <div className="space-y-1">
                    <CardTitle className="text-xl font-bold text-white">{p.name}</CardTitle>
                    <p className="text-xs text-zinc-400 leading-relaxed">{p.description}</p>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-black text-white">{p.price}</span>
                    <span className="text-xs text-zinc-400">/ month</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 px-6 sm:px-8 pb-6">
                  <ul className="space-y-3">
                    {p.features.map(f => (
                      <li key={f} className="flex items-center gap-3 text-xs sm:text-sm text-zinc-300">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="p-6 sm:p-8 pt-0 mt-auto">
                  {p.current ? (
                    <Button
                      disabled
                      className="w-full h-11 rounded-2xl font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 pointer-events-none text-xs sm:text-sm"
                    >
                      Your Current Plan
                    </Button>
                  ) : (
                    <Link
                      href="/settings"
                      className={cn(
                        buttonVariants(),
                        "w-full h-11 rounded-2xl font-bold transition-all text-xs sm:text-sm flex items-center justify-center",
                        p.popular ? "bg-white text-black hover:bg-zinc-200" : "bg-white/10 text-white hover:bg-white/20",
                      )}
                    >
                      {`Upgrade to ${p.name}`}
                    </Link>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>

        {/* Security Footer */}
        <div className="flex flex-col md:flex-row justify-between items-center py-8 border-t border-white/10 gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-2xl shrink-0">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Encrypted Transactions</p>
              <p className="text-xs text-zinc-400">We utilize Clerk & Stripe for global payment security.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <Link
              href="/settings"
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "text-zinc-400 hover:text-white flex items-center gap-2 text-xs",
              )}
            >
              <History className="w-4 h-4" />
              <span>View Invoice History</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
