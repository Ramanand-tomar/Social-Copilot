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
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchUsage = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/usage");
      if (!res.ok) throw new Error("Failed to fetch usage data");
      const json = await res.json();
      setData(json);
    } catch (error) {
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

  // Fetch finished but returned nothing (network error, auth lost, etc).
  // Show a recoverable error state instead of crashing on destructure.
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
          Retry
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
        "500MB Media Storage",
        "10 AI Captions /mo"
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
        "10GB Media Storage",
        "500 AI Captions /mo",
        "Advanced Analytics"
      ],
      current: plan === "pro",
      popular: true,
    },
    {
      name: "Business",
      id: "business",
      price: "$99",
      description: "Unlimited power for agencies and large teams.",
      features: [
        "100 Social Accounts",
        "Unlimited Posts",
        "Unlimited Auto-Reply",
        "100GB Media Storage",
        "Unlimited AI Support",
        "Custom Branding"
      ],
      current: plan === "business",
    }
  ];

  const usageMeters = [
    { label: "Connected Accounts", used: usage.accounts, limit: limits.maxSocialAccounts, icon: Users },
    { label: "Scheduled Posts", used: usage.posts, limit: limits.maxScheduledPosts, icon: CreditCard },
    { label: "Auto-Reply Rules", used: usage.rules, limit: limits.maxAutoReplyRules, icon: MessageSquare },
    { label: "AI Captions", used: usage.aiCaptions, limit: limits.aiCaptionsPerMonth, icon: Sparkles },
    { label: "Media Storage", used: usage.storageMB, limit: limits.maxStorageMB, icon: HardDrive, unit: "MB" },
  ];

  return (
    <div className="flex-1 h-full bg-black min-h-screen">
      <div className="max-w-[1200px] mx-auto p-6 lg:p-10 space-y-12">
        
        {/* Current Plan Banner */}
        <Card className="bg-zinc-900 border-zinc-800 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] -z-10" />
          <CardHeader className="p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-2">
                <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 mb-2">
                  Active Subscription
                </Badge>
                <CardTitle className="text-4xl font-black text-white capitalize flex items-center gap-3">
                  {plan} Plan
                  <Zap className="w-6 h-6 text-indigo-400 fill-indigo-400" />
                </CardTitle>
                <CardDescription className="text-zinc-500 max-w-md">
                  Manage your subscription, payment methods and invoices securely through Clerk.
                </CardDescription>
              </div>
              <div className="flex gap-3">
                {/*
                  Manage Billing routes to /settings, where <UserProfile />
                  embeds Clerk's billing/subscription management section.
                  Once Clerk Billing is enabled on the instance the user
                  sees their plan, invoices, and payment methods there.
                */}
                <Link
                  href="/settings"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "bg-zinc-800 border-zinc-700 h-11 px-6 rounded-xl hover:bg-zinc-700 text-white",
                  )}
                >
                  Manage Billing
                </Link>
                {/*
                  Upgrade Now jumps to the plan comparison + pricing grid
                  further down the page. Individual plan cards route to
                  /settings where Clerk Billing drives the actual checkout.
                */}
                <a
                  href="#compare-plans"
                  className={cn(
                    buttonVariants(),
                    "bg-indigo-600 hover:bg-indigo-500 text-white h-11 px-6 rounded-xl shadow-[0_0_15px_rgba(79,70,229,0.3)]",
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
           <h2 className="text-lg font-semibold text-zinc-300 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            Plan Usage
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {usageMeters.map((meter) => {
              const percentage = Math.min(Math.round((meter.used / meter.limit) * 100), 100);
              return (
                <Card key={meter.label} className="bg-zinc-900 border-zinc-800">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <meter.icon className="w-4 h-4 text-zinc-500" />
                        <span className="text-xs font-medium text-zinc-300">{meter.label}</span>
                      </div>
                      <span className="text-[10px] font-bold text-zinc-500">
                        {meter.used}{meter.unit && ` ${meter.unit}`} / {meter.limit}{meter.unit && ` ${meter.unit}`}
                      </span>
                    </div>
                    <Progress value={percentage} className="h-1.5 bg-zinc-800" />
                    <p className="text-[10px] text-zinc-500 text-right">
                      {percentage}% consumed
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Comparison Cards */}
        <div id="compare-plans" className="space-y-8 pt-8 border-t border-zinc-900 scroll-mt-24">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-white tracking-tight">Compare Plans</h2>
            <p className="text-zinc-500 text-sm">Find the perfect plan for your social media strategy.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingPlans.map((p) => (
              <Card key={p.id} className={cn(
                "bg-zinc-950 border-zinc-900 flex flex-col relative transition-all duration-300 hover:scale-[1.02]",
                p.popular && "border-indigo-500/50 shadow-[0_0_40px_rgba(79,70,229,0.1)] scale-105 z-10",
                p.current && "ring-2 ring-emerald-500/20"
              )}>
                {p.popular && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-600 text-[10px] font-bold text-white px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                    Most Popular
                  </div>
                )}
                <CardHeader className="space-y-4 p-8">
                  <div className="space-y-1">
                    <CardTitle className="text-xl font-bold">{p.name}</CardTitle>
                    <p className="text-xs text-zinc-500">{p.description}</p>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white">{p.price}</span>
                    <span className="text-xs text-zinc-500">/ month</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 px-8 pb-8">
                  <ul className="space-y-4">
                    {p.features.map(f => (
                      <li key={f} className="flex items-center gap-3 text-sm text-zinc-400">
                        <Check className="w-4 h-4 text-emerald-500 min-w-4" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="p-8 pt-0 mt-auto">
                  {p.current ? (
                    <Button
                      disabled
                      className="w-full h-12 rounded-xl font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 pointer-events-none"
                    >
                      Your Current Plan
                    </Button>
                  ) : (
                    <Link
                      href="/settings"
                      className={cn(
                        buttonVariants(),
                        "w-full h-12 rounded-xl font-bold transition-all",
                        p.popular ? "bg-white text-black hover:bg-zinc-200" : "bg-zinc-800 text-white hover:bg-zinc-700",
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
        <div className="flex flex-col md:flex-row justify-between items-center py-10 border-t border-zinc-900 gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-2xl">
               <ShieldCheck className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Encrypted Transactions</p>
              <p className="text-xs text-zinc-500">We utilize Clerk & Stripe for global payment security.</p>
            </div>
          </div>
          <div className="flex gap-4">
             <Link
               href="/settings"
               className={cn(
                 buttonVariants({ variant: "ghost" }),
                 "text-zinc-500 hover:text-white flex items-center gap-2",
               )}
             >
               <History className="w-4 h-4" />
               View Invoice History
               <ExternalLink className="w-3 h-3" />
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
