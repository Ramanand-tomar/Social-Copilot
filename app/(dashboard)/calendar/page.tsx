"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarView } from "@/components/dashboard/CalendarView";
import { CalendarSidebar } from "@/components/dashboard/CalendarSidebar";
import { CalendarSkeleton } from "@/components/dashboard/CalendarSkeleton";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { toast } from "sonner";

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // We fetch a wide range (current month +/- 1 week) to handle edge overlaps
  const start = startOfWeek(startOfMonth(currentDate));
  const end = endOfWeek(endOfMonth(currentDate));

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["posts", start.toISOString(), end.toISOString()],
    queryFn: async () => {
      const res = await fetch(`/api/posts?start=${start.toISOString()}&end=${end.toISOString()}`);
      if (!res.ok) throw new Error("Failed to fetch posts");
      return res.json();
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: async ({ id, newDate }: { id: string, newDate: Date }) => {
      const res = await fetch(`/api/posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt: newDate.toISOString(),
          status: "scheduled",
        }),
      });
      if (!res.ok) throw new Error("Failed to reschedule");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast.success("Post rescheduled successfully");
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  if (isLoading) {
    return <CalendarSkeleton />;
  }

  const posts = data?.posts || [];

  return (
    <div className="flex-1 h-full">
      <div className="max-w-[1600px] mx-auto p-6 lg:p-10">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Main Calendar Section */}
          <div className="flex-1 w-full space-y-6">
            <div className="flex flex-col gap-1">
              <h1 className="text-3xl font-bold tracking-tight text-white">Content Calendar</h1>
              <p className="text-zinc-500 text-sm italic">
                Visualize and manage your social media schedule. Drag and drop to re-arrange.
              </p>
            </div>
            
            <CalendarView 
              posts={posts} 
              onReschedule={(id, newDate) => rescheduleMutation.mutate({ id, newDate })}
              onRefresh={refetch}
            />
          </div>

          {/* Sidebar */}
          <div className="md:sticky md:top-24">
            <CalendarSidebar posts={posts} />
          </div>
        </div>
      </div>
    </div>
  );
}
