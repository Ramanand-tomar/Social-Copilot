"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarView } from "@/components/dashboard/CalendarView";
import { CalendarSidebar } from "@/components/dashboard/CalendarSidebar";
import { CalendarSkeleton } from "@/components/dashboard/CalendarSkeleton";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { toast } from "sonner";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());

  const start = startOfWeek(startOfMonth(currentDate));
  const end = endOfWeek(endOfMonth(currentDate));

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["posts", start.toISOString(), end.toISOString()],
    queryFn: async () => {
      const res = await fetch(`/api/posts?start=${start.toISOString()}&end=${end.toISOString()}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to fetch scheduled posts");
      }
      return res.json();
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: async ({ id, newDate }: { id: string; newDate: Date }) => {
      const res = await fetch(`/api/posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt: newDate.toISOString(),
          status: "scheduled",
        }),
      });
      if (!res.ok) throw new Error("Failed to reschedule post");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast.success("Post rescheduled successfully");
    },
    onError: (err: any) => {
      toast.error(`Error: ${err.message}`);
    },
  });

  if (isLoading) {
    return <CalendarSkeleton />;
  }

  if (isError) {
    return (
      <div className="flex-1 p-6 lg:p-10 max-w-[1600px] mx-auto">
        <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-8 text-center space-y-4 max-w-md mx-auto my-12">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Failed to Load Calendar</h2>
          <p className="text-sm text-zinc-400">
            {(error as any)?.message || "An unexpected error occurred while loading your scheduled posts."}
          </p>
          <Button
            onClick={() => refetch()}
            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-6 h-10 text-sm font-semibold"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            <span>Try Again</span>
          </Button>
        </div>
      </div>
    );
  }

  const posts = data?.posts || [];

  return (
    <div className="flex-1 h-full">
      <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-10">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Main Calendar Section */}
          <div className="flex-1 w-full space-y-6 min-w-0">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Content Calendar</h1>
              <p className="text-zinc-400 text-xs sm:text-sm">
                Visualize and manage your scheduled posts across all connected networks.
              </p>
            </div>
            
            <CalendarView 
              posts={posts} 
              onReschedule={(id, newDate) => rescheduleMutation.mutate({ id, newDate })}
              onRefresh={refetch}
            />
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-80 lg:sticky lg:top-24">
            <CalendarSidebar posts={posts} />
          </div>
        </div>
      </div>
    </div>
  );
}
