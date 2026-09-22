"use client";

import React, { useState } from "react";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  SheetFooter
} from "@/components/ui/sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { 
  Calendar as CalendarIcon, 
  Trash2, 
  Edit3, 
  Clock, 
  ExternalLink,
  MessageSquare,
  Image as ImageIcon
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";

interface PostDetailSheetProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  post?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
  onUpdated: () => void;
}

const statusConfig: Record<string, { label: string, color: string }> = {
  scheduled: { label: "Scheduled", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
  posted: { label: "Published", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  draft: { label: "Draft", color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
  failed: { label: "Failed", color: "bg-red-500/10 text-red-400 border-red-500/20" },
  partial: { label: "Partial Success", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
};

export const PostDetailSheet = ({ 
  post, 
  open, 
  onOpenChange, 
  onDeleted,
  onUpdated 
}: PostDetailSheetProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  if (!post) return null;

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete post");
      toast.success("Post deleted successfully");
      onDeleted();
      onOpenChange(false);
    } catch {
      toast.error("Error deleting post");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReschedule = async (newDate: Date | undefined) => {
    if (!newDate) return;
    
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt: newDate.toISOString(),
          scheduledTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          status: "scheduled",
        }),
      });
      if (!res.ok) throw new Error("Failed to reschedule");
      toast.success("Post rescheduled successfully");
      onUpdated();
      onOpenChange(false);
    } catch {
      toast.error("Error rescheduling post");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-zinc-100">
        <SheetHeader className="space-y-4">
          <div className="flex justify-between items-center">
            <Badge className={cn("px-2.5 py-0.5 border capitalize", statusConfig[post.status]?.color)}>
              {statusConfig[post.status]?.label || post.status}
            </Badge>
            <div className="flex gap-2">
            <Link 
              href={`/compose?id=${post.id}`}
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "h-8 w-8 text-zinc-400 hover:text-indigo-400"
              )}
            >
              <Edit3 className="h-4 w-4" />
            </Link>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-zinc-400 hover:text-red-400"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <SheetTitle className="text-xl font-bold tracking-tight text-white">Post Details</SheetTitle>
          <SheetDescription className="text-zinc-400">
            {post.status === "scheduled" ? "Scheduled for publishing" : "Review your post content and status."}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-8 space-y-8">
          {/* Content */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
              <MessageSquare className="h-3.5 w-3.5" />
              Content
            </div>
            <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800 whitespace-pre-wrap text-sm text-zinc-300 leading-relaxed">
              {post.content}
            </div>
          </div>

          {/* Media Section */}
          {post.mediaUrls && post.mediaUrls.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                <ImageIcon className="h-3.5 w-3.5" />
                Media Assets
              </div>
              <div className="grid grid-cols-2 gap-2">
                {post.mediaUrls.map((url: string, i: number) => (
                  <div key={i} className="aspect-square relative rounded-lg overflow-hidden border border-zinc-800 group">
                    <img src={url} alt="" className="object-cover w-full h-full" />
                    <a 
                      href={url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                    >
                      <ExternalLink className="text-white h-5 w-5" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Schedule / Timing */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
              <Clock className="h-3.5 w-3.5" />
              Schedule Settings
            </div>
            <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
              <div className="space-y-1">
                <p className="text-sm font-medium text-zinc-200">
                  {post.scheduledAt ? format(new Date(post.scheduledAt), "PPP p") : "Not scheduled"}
                </p>
                <p className="text-xs text-zinc-500">Scheduled publish time</p>
              </div>
              
              <Popover>
                <PopoverTrigger 
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "bg-zinc-800 border-zinc-700 text-xs"
                  )}
                >
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  Reschedule
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-800" align="end">
                  <Calendar
                    mode="single"
                    selected={post.scheduledAt ? new Date(post.scheduledAt) : new Date()}
                    onSelect={handleReschedule}
                    initialFocus
                    className="bg-transparent"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        <SheetFooter className="mt-auto pt-8">
          <Link 
            href={`/compose?id=${post.id}`}
            className={cn(
              buttonVariants({ variant: "default" }),
              "w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center justify-center rounded-xl h-10"
            )}
          >
            Full Edit in Composer
          </Link>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
