import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { posts, autoReplyRules, socialAccounts } from "@/lib/db/schema";
import { eq, sql, gte, and } from "drizzle-orm";
import { ensureUserFromClerk } from "@/lib/users";
import {
  Send,
  Clock,
  MessageSquare,
  TrendingUp,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
} from "lucide-react";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { subDays, format } from "date-fns";

export default async function DashboardOverview() {
  const { userId: clerkId } = await auth();
  // The proxy middleware should already have redirected unauthenticated
  // requests to /sign-in. This is a defense-in-depth check — without it
  // a stale session or middleware skip would render a blank page.
  if (!clerkId) redirect("/sign-in?redirect_url=/dashboard");

  // 1. Get (or lazily backfill) internal User row
  const user = await ensureUserFromClerk(clerkId);
  if (!user) redirect("/sign-in?redirect_url=/dashboard");

  // All dashboard metrics fire in parallel — cuts cold-start latency on
  // the landing page for signed-in users by roughly half.
  const sevenDaysAgo = subDays(new Date(), 7);
  const [
    [totalPostsResult],
    [scheduledPostsResult],
    [totalRepliesResult],
    recentPostsData,
    activityRaw,
    connectedAccounts,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(posts).where(eq(posts.userId, user.id)),
    db.select({ count: sql<number>`count(*)` }).from(posts).where(and(eq(posts.userId, user.id), eq(posts.status, "scheduled"))),
    db.select({ sum: sql<number>`sum(${autoReplyRules.replyCount})` }).from(autoReplyRules).where(eq(autoReplyRules.userId, user.id)),
    db.query.posts.findMany({
      where: eq(posts.userId, user.id),
      orderBy: (posts, { desc }) => [desc(posts.createdAt)],
      limit: 5,
    }),
    db
      .select({
        date: sql<string>`DATE(${posts.createdAt})`,
        count: sql<number>`count(*)`,
      })
      .from(posts)
      .where(and(eq(posts.userId, user.id), gte(posts.createdAt, sevenDaysAgo)))
      .groupBy(sql`DATE(${posts.createdAt})`)
      .orderBy(sql`DATE(${posts.createdAt})`),
    db.query.socialAccounts.findMany({
      where: eq(socialAccounts.userId, user.id),
    }),
  ]);

  const totalPosts = Number(totalPostsResult?.count || 0);
  const scheduledPostsCount = Number(scheduledPostsResult?.count || 0);
  const totalReplies = Number(totalRepliesResult?.sum || 0);

  // Transform activity data for the chart
  const activityData = Array.from({ length: 7 }).map((_, i) => {
    const d = subDays(new Date(), 6 - i);
    const dateStr = format(d, "yyyy-MM-dd");
    const dayLabel = format(d, "EEE");
    const match = activityRaw.find((r) => format(new Date(r.date), "yyyy-MM-dd") === dateStr);
    return { name: dayLabel, posts: match ? Number(match.count) : 0 };
  });

  // Platform breakdown from connected accounts (simpler + accurate than
  // trying to reconcile selectedAccounts ids with platform names).
  const connectedPlatformCounts: Record<string, number> = {};
  connectedAccounts.forEach((acc) => {
    connectedPlatformCounts[acc.platform] = (connectedPlatformCounts[acc.platform] || 0) + 1;
  });

  const platformColors: Record<string, string> = {
    twitter: "#4f46e5",
    instagram: "#e11d48",
    facebook: "#1d4ed8",
    linkedin: "#0369a1",
    youtube: "#b91c1c",
    tiktok: "#000000"
  };

  const totalPlats = Object.values(connectedPlatformCounts).reduce((a, b) => a + b, 0) || 1;
  const platformData = Object.entries(connectedPlatformCounts).map(([name, count]) => ({
    name,
    value: Math.round((count / totalPlats) * 100),
    color: platformColors[name] || "#6366f1"
  }));

  // Honest empty state — don't pretend to have data when the user hasn't
  // connected any accounts yet.
  const hasConnectedAccounts = platformData.length > 0;

  const stats = [
    { name: "Total Posts", value: totalPosts.toString(), icon: Send, trend: "+0%", color: "text-blue-400", bg: "bg-blue-500/10" },
    { name: "Scheduled", value: scheduledPostsCount.toString(), icon: Clock, trend: "+0%", color: "text-amber-400", bg: "bg-amber-500/10" },
    { name: "Total Reach", value: "0", icon: TrendingUp, trend: "+0%", color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { name: "Auto Replies", value: totalReplies.toString(), icon: MessageSquare, trend: "+0%", color: "text-indigo-400", bg: "bg-indigo-500/10" },
  ];

  return (
    <div className="space-y-12 animate-in fade-in duration-700 px-4 py-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter">
            Dashboard <span className="text-zinc-600">Overview</span>
          </h1>
          <p className="text-zinc-500 mt-2 font-medium">Monitoring your social engine across all connected nodes.</p>
        </div>
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-2 rounded-2xl">
           <div className="px-4 py-2 bg-indigo-600 rounded-xl text-xs font-bold text-white shadow-lg shadow-indigo-600/20">
             7D View
           </div>
           <div className="px-4 py-2 text-xs font-bold text-zinc-500">
             Real-time Sync
           </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-[#0a0a1a] p-8 rounded-[2.5rem] border border-white/5 shadow-xl hover:border-white/10 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.02] -mr-12 -mt-12 rounded-full" />
            
            <div className="flex items-center justify-between mb-6">
              <div className={stat.bg + " p-4 rounded-2xl transition-all group-hover:scale-110 shadow-inner"}>
                <stat.icon className={stat.color + " w-6 h-6"} />
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold tracking-widest uppercase">
                <ArrowUpRight className="w-2.5 h-2.5" />
                {stat.trend}
              </div>
            </div>
            
            <div>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em] mb-1">{stat.name}</p>
              <h3 className="text-3xl font-black text-white tabular-nums">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section (Client Component) */}
      <DashboardCharts
        activityData={activityData}
        platformData={platformData}
        hasConnectedAccounts={hasConnectedAccounts}
      />

      {/* Recent Posts Table */}
      <div className="bg-[#0a0a1a] rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden group">
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
          <div>
            <h3 className="text-xl font-black text-white tracking-tight">Recent Activity</h3>
            <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-bold">Latest broadcast logs</p>
          </div>
          <button className="text-indigo-400 text-xs font-black uppercase tracking-widest hover:text-indigo-300 transition-colors flex items-center gap-2 px-6 py-3 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
            View All Logs
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/[0.01] border-b border-white/5">
                <th className="px-8 py-5 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Content Stream</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Timestamp</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recentPostsData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                     <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center">
                          <Send className="w-8 h-8 text-zinc-700" />
                        </div>
                        <p className="text-xs font-bold text-zinc-600 uppercase tracking-[0.2em]">No recent activity detected</p>
                     </div>
                  </td>
                </tr>
              ) : recentPostsData.map((post) => (
                <tr key={post.id} className="hover:bg-white/[0.02] transition-colors group/row">
                  <td className="px-8 py-6">
                    <p className="text-sm text-zinc-200 font-bold truncate max-w-sm">{post.content}</p>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      {post.status === "posted" && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Success</span>
                        </div>
                      )}
                      {post.status === "scheduled" && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Planned</span>
                        </div>
                      )}
                      {post.status === "failed" && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Error</span>
                        </div>
                      )}
                      {post.status === "draft" && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-800 text-zinc-400 border border-white/5">
                          <span className="text-[10px] font-black uppercase tracking-widest">Draft</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-xs font-medium text-zinc-500 tabular-nums">
                      {format(new Date(post.createdAt), "MMM d, HH:mm")}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button className="p-3 text-zinc-700 hover:text-white hover:bg-white/5 rounded-2xl transition-all opacity-0 group-hover/row:opacity-100">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
