"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  Play,
  LayoutDashboard,
  PenSquare,
  Calendar,
  MessageSquareReply,
  Users,
  ImageIcon,
  TrendingUp,
  Heart,
  Eye,
  Send,
  CheckCircle2,
  Clock,
  Wand2,
  Bell,
  Search,
} from "lucide-react";
import { useAuth } from "@clerk/nextjs";

// Social proof stats shown below the mockup.
const STATS = [
  { value: "10K+", label: "Active Creators" },
  { value: "2.4M", label: "Posts Published" },
  { value: "99.9%", label: "Uptime SLA" },
  { value: "4.9/5", label: "Customer Rating" },
];

export default function Hero() {
  const { isSignedIn } = useAuth();

  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      {/* Animated background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-indigo-600/20 blur-[120px] rounded-full opacity-60 -z-10 animate-drift" />
      <div className="absolute top-[200px] right-0 w-[500px] h-[500px] bg-cyan-500/15 blur-[100px] rounded-full -z-10 animate-drift" />
      <div className="absolute top-[100px] left-0 w-[400px] h-[400px] bg-violet-500/15 blur-[100px] rounded-full -z-10 animate-drift" />

      {/* Grid background */}
      <div className="absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)] -z-10" />

      <div className="max-w-7xl mx-auto px-6 text-center">
        {/* Announcement pill */}
        <Link
          href="#features"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur hover:bg-white/10 transition-colors group"
        >
          <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
          <span className="text-sm font-medium text-indigo-300">
            v2.0 — Gemini-powered AI writing
          </span>
          <ArrowUpRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        </Link>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight mb-6">
          Automate your Social <br />
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-300 bg-clip-text text-transparent">
            Without the Chaos
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-lg text-gray-400 mb-10 leading-relaxed">
          The all-in-one copilot to schedule, analyze, and automate your social
          presence across every major platform — powered by advanced AI.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link
            href={isSignedIn ? "/dashboard" : "/sign-up"}
            className="group inline-flex items-center justify-center gap-2 h-14 px-8 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-lg font-bold shadow-[0_10px_40px_-10px_rgba(99,102,241,0.6)] transition-all hover:scale-[1.03]"
          >
            {isSignedIn ? "Go to Dashboard" : "Get Started for Free"}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="#how-it-works"
            className="group inline-flex items-center justify-center gap-2 h-14 px-8 rounded-2xl bg-white/5 border border-white/10 text-white text-lg font-semibold backdrop-blur hover:bg-white/10 hover:border-white/20 transition-all"
          >
            <Play className="w-4 h-4 fill-current" />
            Watch Demo
          </Link>
        </div>

        {/* Trust bar */}
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 mb-20 text-gray-500 text-sm">
          <span className="font-medium">Trusted by teams at</span>
          <span className="font-bold text-gray-300 tracking-wider">TECHSCALE</span>
          <span className="font-bold text-gray-300 tracking-wider">VENTUREFLOW</span>
          <span className="font-bold text-gray-300 tracking-wider">NORTHWIND</span>
          <span className="font-bold text-gray-300 tracking-wider">ARCADIA LABS</span>
          <span className="font-bold text-gray-300 tracking-wider">LUMEN CO.</span>
        </div>

        {/* Premium dashboard mockup */}
        <div className="relative mx-auto max-w-6xl group">
          {/* Outer gradient glow */}
          <div className="absolute -inset-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 rounded-[2.5rem] blur opacity-30 group-hover:opacity-50 transition duration-1000 animate-border-pulse" />

          {/* Browser chrome frame */}
          <div className="relative bg-[#0a0a1a] rounded-[2rem] border border-white/10 overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)]">
            {/* Window bar */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5 bg-black/20">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="flex items-center gap-2 px-4 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-gray-500 font-mono">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  app.socialcopilot.com/dashboard
                </div>
              </div>
            </div>

            {/* Dashboard layout */}
            <div className="flex min-h-[540px]">
              {/* Sidebar */}
              <aside className="hidden md:flex flex-col w-56 border-r border-white/5 bg-black/20 p-4 gap-1">
                <div className="flex items-center gap-2 px-3 py-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-bold text-white">SocialCopilot</span>
                </div>

                <SideItem icon={LayoutDashboard} label="Dashboard" active />
                <SideItem icon={PenSquare} label="Compose" />
                <SideItem icon={Calendar} label="Calendar" />
                <SideItem icon={MessageSquareReply} label="Auto Reply" />
                <div className="h-px bg-white/5 my-3" />
                <SideItem icon={Users} label="Accounts" />
                <SideItem icon={ImageIcon} label="Media" />
              </aside>

              {/* Main */}
              <div className="flex-1 p-6 space-y-5 overflow-hidden">
                {/* Topbar */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-zinc-600 uppercase tracking-widest">
                      Monday, April 11
                    </div>
                    <div className="text-lg font-bold text-white mt-0.5">
                      Welcome back, Alex
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="hidden lg:flex items-center gap-2 h-9 px-3 rounded-lg bg-white/5 border border-white/10">
                      <Search className="w-3.5 h-3.5 text-zinc-500" />
                      <div className="w-28 h-2 bg-white/10 rounded-full" />
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                      <Bell className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div className="h-9 px-4 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 flex items-center gap-1.5 text-white text-xs font-bold shadow-lg shadow-indigo-600/30">
                      <Wand2 className="w-3.5 h-3.5" />
                      New Post
                    </div>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-4 gap-3">
                  <StatCard
                    icon={Send}
                    label="Total Posts"
                    value="1,284"
                    trend="+12%"
                    color="indigo"
                  />
                  <StatCard
                    icon={Heart}
                    label="Engagement"
                    value="48.2K"
                    trend="+34%"
                    color="rose"
                  />
                  <StatCard
                    icon={Eye}
                    label="Impressions"
                    value="920K"
                    trend="+28%"
                    color="cyan"
                  />
                  <StatCard
                    icon={TrendingUp}
                    label="Followers"
                    value="12,847"
                    trend="+8%"
                    color="emerald"
                  />
                </div>

                {/* Main grid: chart + activity */}
                <div className="grid grid-cols-3 gap-3">
                  {/* Chart card */}
                  <div className="col-span-2 rounded-2xl bg-white/[0.03] border border-white/10 p-5 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-5">
                      <div className="text-xs font-bold text-white">
                        Post Activity
                      </div>
                      <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
                        Last 7 days
                      </div>
                    </div>
                    {/* Bar chart */}
                    <div className="flex items-end justify-between gap-2 h-28">
                      {[42, 65, 38, 78, 95, 54, 82].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t-lg bg-gradient-to-t from-indigo-600/60 to-indigo-400 relative overflow-hidden"
                          style={{ height: `${h}%` }}
                        >
                          <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/20 to-transparent" />
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between mt-2 text-[9px] text-zinc-600 font-bold uppercase tracking-widest">
                      <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                    </div>
                  </div>

                  {/* Recent activity */}
                  <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-5">
                    <div className="text-xs font-bold text-white mb-4">
                      Recent Activity
                    </div>
                    <div className="space-y-3">
                      <ActivityRow
                        icon={CheckCircle2}
                        color="text-emerald-400 bg-emerald-500/10"
                        title="Posted to X"
                        time="2m ago"
                      />
                      <ActivityRow
                        icon={Clock}
                        color="text-amber-400 bg-amber-500/10"
                        title="Scheduled"
                        time="1h ago"
                      />
                      <ActivityRow
                        icon={MessageSquareReply}
                        color="text-indigo-400 bg-indigo-500/10"
                        title="Auto-replied"
                        time="3h ago"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating badges */}
          <div className="hidden md:flex absolute -left-8 top-1/3 items-center gap-3 px-4 py-3 rounded-2xl bg-[#0f0f1f] border border-white/10 shadow-2xl rotate-[-6deg] animate-drift">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-left">
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Just Posted
              </div>
              <div className="text-sm font-bold text-white">+2.4K likes</div>
            </div>
          </div>

          <div className="hidden md:flex absolute -right-8 bottom-1/4 items-center gap-3 px-4 py-3 rounded-2xl bg-[#0f0f1f] border border-white/10 shadow-2xl rotate-[6deg] animate-drift">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="text-left">
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                AI Draft Ready
              </div>
              <div className="text-sm font-bold text-white">3 variants</div>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mt-20">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur"
            >
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent">
                {stat.value}
              </div>
              <div className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-2">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SideItem({
  icon: Icon,
  label,
  active = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold ${
        active
          ? "bg-indigo-500/10 text-indigo-300"
          : "text-zinc-500"
      }`}
    >
      <Icon className={`w-4 h-4 ${active ? "text-indigo-400" : ""}`} />
      {label}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  trend: string;
  color: "indigo" | "rose" | "cyan" | "emerald";
}) {
  const palette: Record<string, { bg: string; text: string }> = {
    indigo: { bg: "bg-indigo-500/10", text: "text-indigo-400" },
    rose: { bg: "bg-rose-500/10", text: "text-rose-400" },
    cyan: { bg: "bg-cyan-500/10", text: "text-cyan-400" },
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400" },
  };
  const c = palette[color];
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${c.text}`} />
        </div>
        <div className="px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[9px] font-bold">
          {trend}
        </div>
      </div>
      <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
        {label}
      </div>
      <div className="text-lg font-bold text-white mt-0.5 tabular-nums">
        {value}
      </div>
    </div>
  );
}

function ActivityRow({
  icon: Icon,
  color,
  title,
  time,
}: {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  title: string;
  time: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={`w-7 h-7 rounded-lg ${color} flex items-center justify-center shrink-0`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-bold text-white truncate">{title}</div>
        <div className="text-[9px] text-zinc-500">{time}</div>
      </div>
    </div>
  );
}
