"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText,
  Plus
} from "lucide-react";
import { format, isToday } from "date-fns";
import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface CalendarSidebarProps {
  posts: any[];
}

export const CalendarSidebar = ({ posts }: CalendarSidebarProps) => {
  const stats = {
    published: posts.filter(p => p.status === "posted").length,
    scheduled: posts.filter(p => p.status === "scheduled").length,
    failed: posts.filter(p => p.status === "failed").length,
    drafts: posts.filter(p => p.status === "draft").length,
  };

  const upcomingToday = posts
    .filter(p => p.status === "scheduled" && p.scheduledAt && isToday(new Date(p.scheduledAt)))
    .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime());

  return (
    <div className="space-y-6 w-full max-w-[320px]">
      {/* Monthly Stats */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-zinc-300">
            <CalendarIcon className="h-4 w-4 text-indigo-400" />
            Monthly Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 pt-0">
          <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-400">Published</span>
            </div>
            <p className="text-xl font-bold text-white">{stats.published}</p>
          </div>
          <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-3.5 w-3.5 text-indigo-400" />
              <span className="text-xs font-medium text-indigo-400">Scheduled</span>
            </div>
            <p className="text-xl font-bold text-white">{stats.scheduled}</p>
          </div>
          <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="h-3.5 w-3.5 text-red-400" />
              <span className="text-xs font-medium text-red-400">Failed</span>
            </div>
            <p className="text-xl font-bold text-white">{stats.failed}</p>
          </div>
          <div className="p-3 bg-zinc-500/5 border border-zinc-500/10 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-3.5 w-3.5 text-zinc-400" />
              <span className="text-xs font-medium text-zinc-400">Drafts</span>
            </div>
            <p className="text-xl font-bold text-white">{stats.drafts}</p>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Posts */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-zinc-300">
              <Clock className="h-4 w-4 text-indigo-400" />
              Upcoming Today
            </CardTitle>
            <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 text-[10px] px-1.5 py-0 border-indigo-500/20">
              {upcomingToday.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0 max-h-[460px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-800">
          {upcomingToday.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-zinc-800 rounded-xl">
              <p className="text-zinc-500 text-xs italic">No posts scheduled for today</p>
            </div>
          ) : (
            upcomingToday.map((post) => (
              <div key={post.id} className="relative group p-3 bg-zinc-950/50 border border-zinc-800/50 rounded-xl hover:border-zinc-700 transition-colors">
                <div className="flex justify-between gap-3 mb-2">
                  <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded uppercase">
                    {format(new Date(post.scheduledAt!), "HH:mm")}
                  </span>
                  <div className="flex -space-x-1.5 overflow-hidden">
                    {/* Platform Icons Mock */}
                    <div className="h-4 w-4 rounded-full bg-blue-500 border border-zinc-900" />
                    <div className="h-4 w-4 rounded-full bg-pink-500 border border-zinc-900" />
                  </div>
                </div>
                <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">
                  {post.content}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* CTA */}
      <Link 
        href="/compose"
        className={cn(
          buttonVariants({ variant: "default" }),
          "w-full h-12 bg-white hover:bg-zinc-100 text-black font-bold text-sm shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all hover:scale-[1.02] flex items-center justify-center rounded-2xl"
        )}
      >
        <Plus className="h-4 w-4 mr-2" />
        Create New Post
      </Link>
    </div>
  );
};
