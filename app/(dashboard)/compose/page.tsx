"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import { 
  Send, 
  Calendar, 
  Clock, 
  Sparkles, 
  Eye, 
  Layout,
  MessageSquare,
  Hash,
  Smile,
  Loader2,
  ChevronRight,
  ShieldCheck,
  Activity
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { platforms, Platform, getStrictestContentLimit } from "@/lib/social-platforms";
import { UpgradeModal } from "@/components/dashboard/UpgradeModal";
import { cn } from "@/lib/utils";
import { Theme } from "emoji-picker-react";
import dynamic from "next/dynamic";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });
const MediaUpload = dynamic(
  () => import("@/components/dashboard/MediaUpload").then((mod) => mod.MediaUpload),
  { ssr: false }
);
const PlatformSelector = dynamic(
  () => import("@/components/dashboard/PlatformSelector").then((mod) => mod.PlatformSelector),
  { ssr: false }
);
const PostPreview = dynamic(
  () => import("@/components/dashboard/PostPreview").then((mod) => mod.PostPreview),
  { ssr: false }
);
const AIWriterDialog = dynamic(
  () => import("@/components/dashboard/AIWriterDialog").then((mod) => mod.AIWriterDialog),
  { ssr: false }
);

export default function ComposePage() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const editingPostId = searchParams.get("id");
  const prefillMediaUrl = searchParams.get("mediaUrl");

  const [content, setContent] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [isScheduling, setIsScheduling] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [limitName, setLimitName] = useState("");
  const [hydratingFromQuery, setHydratingFromQuery] = useState<boolean>(
    !!editingPostId,
  );

  // Fetch selected platforms details for preview
  // Note: For simplicity, we'll get the first platform selected for the preview tab
  const [previewPlatform, setPreviewPlatform] = useState<Platform>("twitter");

  // Hydrate the form from query params on mount.
  //
  //   ?id=<postId>          -> load the post and prefill content, media,
  //                            selected accounts, and (if scheduled) the
  //                            schedule time.
  //   ?mediaUrl=<url>       -> seed the media gallery with a single asset
  //                            from /media -> "Use in Post".
  //
  // Both deep-links land on the same composer; if both are present we
  // prefer the post (it already has its own media).
  useEffect(() => {
    let cancelled = false;

    if (editingPostId) {
      (async () => {
        try {
          const res = await fetch(`/api/posts?limit=200`);
          if (!res.ok) throw new Error("Failed to load post");
          const data = await res.json();
          const post = (data.posts ?? []).find((p: any) => p.id === editingPostId);
          if (!post || cancelled) return;

          setContent(post.content ?? "");
          setMediaUrls(Array.isArray(post.mediaUrls) ? post.mediaUrls : []);
          setSelectedAccountIds(
            Array.isArray(post.selectedAccounts) ? post.selectedAccounts : [],
          );

          if (post.scheduledAt) {
            // <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm" in
            // local time, NOT a UTC ISO string.
            const d = new Date(post.scheduledAt);
            const pad = (n: number) => String(n).padStart(2, "0");
            const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
              d.getDate(),
            )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
            setScheduledAt(local);
            setIsScheduling(true);
          }
        } catch (err: any) {
          toast.error(err?.message ?? "Failed to load post for editing");
        } finally {
          if (!cancelled) setHydratingFromQuery(false);
        }
      })();
    } else if (prefillMediaUrl) {
      setMediaUrls((prev) => (prev.includes(prefillMediaUrl) ? prev : [...prev, prefillMediaUrl]));
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingPostId, prefillMediaUrl]);

  // Strictest per-platform character limit among the currently selected
  // accounts. Shown next to the counter and used to disable publish.
  const contentLimit = getStrictestContentLimit(selectedPlatforms);
  const overLimit = content.length > contentLimit;

  const handlePublish = async (isScheduled: boolean) => {
    if (!content && mediaUrls.length === 0) {
      toast.error("Please add some content or media");
      return;
    }
    if (selectedAccountIds.length === 0) {
      toast.error("Please select at least one account");
      return;
    }
    if (isScheduled && !scheduledAt) {
      toast.error("Please select a schedule time");
      return;
    }
    if (content.length > contentLimit) {
      toast.error(`Content exceeds the ${contentLimit}-character limit of your selected platforms.`);
      return;
    }

    setPublishing(true);
    try {
      // `datetime-local` returns a naive string like "2025-06-01T14:00".
      // We serialize to UTC (browser's local tz → UTC) AND send the IANA zone
      // alongside so the server can display "2:00 PM America/Toronto" later.
      const scheduledAtIso = isScheduled ? new Date(scheduledAt).toISOString() : null;
      const scheduledTimezone = isScheduled
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : null;

      const endpoint = editingPostId ? `/api/posts/${editingPostId}` : "/api/posts";
      const method = editingPostId ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          mediaUrls,
          accountIds: selectedAccountIds,
          scheduledAt: scheduledAtIso,
          scheduledTimezone,
          status: isScheduled ? "scheduled" : "posted",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 403 && data.error === "limit_reached") {
          setLimitName(data.limitName || "Scheduled Posts");
          setIsUpgradeOpen(true);
          return;
        }
        throw new Error(data.message || "Failed to create post");
      }

      toast.success(isScheduled ? "Post scheduled successfully!" : "Post published to queue!");
      await queryClient.invalidateQueries({ queryKey: ["posts"] });

      // Reset form
      setContent("");
      setMediaUrls([]);
      setSelectedAccountIds([]);
      setScheduledAt("");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setPublishing(false);
    }
  };

  const onEmojiClick = (emojiData: any) => {
    setContent(prev => prev + emojiData.emoji);
    setShowEmoji(false);
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto h-[calc(100vh-6rem)]">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
        
        {/* Left Column: Editor (8 cols) */}
        <div className="lg:col-span-7 space-y-6 overflow-y-auto pr-4 scrollbar-hide">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <Layout className="w-8 h-8 text-indigo-400" />
              Compose Post
            </h1>
            <AIWriterDialog
              onGenerate={(text) => setContent(text)}
              maxChars={contentLimit}
            />
          </div>

          <Card className="bg-white/5 border-white/10 rounded-[2.5rem] overflow-hidden">
            <CardContent className="p-8 space-y-8">
              {/* Account Selection */}
              <div className="space-y-4">
                <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Select Channels
                </label>
                <PlatformSelector
                  selectedIds={selectedAccountIds}
                  onChange={setSelectedAccountIds}
                  onPlatformsChange={setSelectedPlatforms}
                />
              </div>

              {/* Text Content */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-400" />
                    Content
                  </label>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setShowEmoji(!showEmoji)}
                      className="text-gray-500 hover:text-white transition-colors"
                    >
                      <Smile className="w-5 h-5" />
                    </button>
                    <span className={cn(
                      "text-xs font-mono",
                      overLimit ? "text-rose-500" : "text-gray-500"
                    )}>
                      {content.length} / {contentLimit}
                    </span>
                  </div>
                </div>
                
                <div className="relative">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="What's on your mind? Start typing or use AI Write..."
                    className="w-full min-h-[220px] bg-white/5 border border-white/10 rounded-2xl p-6 text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/50 transition-all text-lg leading-relaxed resize-none"
                  />
                  {showEmoji && (
                    <div className="absolute top-12 right-0 z-50">
                      <EmojiPicker onEmojiClick={onEmojiClick} theme={Theme.DARK} />
                    </div>
                  )}
                </div>
              </div>

              {/* Media Upload */}
              <div className="space-y-4">
                <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  Media Gallery
                </label>
                <MediaUpload urls={mediaUrls} onChange={setMediaUrls} />
              </div>

              {/* Action Bar */}
              <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <button 
                    onClick={() => setIsScheduling(!isScheduling)}
                    className={cn(
                      "flex items-center gap-2 px-6 py-3 rounded-2xl border transition-all",
                      isScheduling 
                        ? "bg-indigo-500/10 border-indigo-500 text-indigo-400" 
                        : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
                    )}
                  >
                    <Calendar className="w-4 h-4" />
                    {isScheduling ? "Scheduling Post" : "Publish Now"}
                  </button>
                  
                  {isScheduling && (
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-2">
                      <Clock className="w-4 h-4 text-indigo-400" />
                      <input 
                        type="datetime-local" 
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        className="bg-transparent text-sm text-white border-none focus:ring-0 outline-none"
                      />
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => handlePublish(isScheduling)}
                  disabled={publishing || overLimit || hydratingFromQuery}
                  className="w-full sm:w-auto px-10 py-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.3)] text-lg font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {publishing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {isScheduling ? "Schedule Post" : "Post Now"}
                      <ChevronRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Previews (5 cols) */}
        <div className="lg:col-span-5 h-full flex flex-col space-y-6">
          <div className="flex items-center gap-3 px-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-indigo-400" />
              Live Previews
            </h2>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <Card className="bg-white/5 border-white/10 rounded-[2.5rem] flex-1 overflow-hidden">
            <CardContent className="p-8 h-full flex flex-col">
              <Tabs defaultValue="twitter" className="h-full flex flex-col" onValueChange={(v) => setPreviewPlatform(v as Platform)}>
                <TabsList className="bg-white/5 border border-white/10 p-1.5 rounded-2xl mb-8 w-fit mx-auto">
                  <TabsTrigger value="twitter" className="rounded-xl px-4 data-[state=active]:bg-indigo-500 data-[state=active]:text-white transition-all text-xs">Twitter</TabsTrigger>
                  <TabsTrigger value="instagram" className="rounded-xl px-4 data-[state=active]:bg-indigo-500 data-[state=active]:text-white transition-all text-xs">Instagram</TabsTrigger>
                  <TabsTrigger value="linkedin" className="rounded-xl px-4 data-[state=active]:bg-indigo-500 data-[state=active]:text-white transition-all text-xs">LinkedIn</TabsTrigger>
                </TabsList>

                <div className="flex-1 flex items-center justify-center p-4">
                  <TabsContent value="twitter" className="w-full mt-0">
                    <PostPreview 
                      content={content} 
                      mediaUrls={mediaUrls} 
                      selectedPlatform="twitter" 
                      username={user?.fullName || "Your Name"}
                      avatarUrl={user?.imageUrl}
                    />
                  </TabsContent>
                  <TabsContent value="instagram" className="w-full mt-0">
                    <PostPreview 
                      content={content} 
                      mediaUrls={mediaUrls} 
                      selectedPlatform="instagram" 
                      username={user?.fullName || "Your Name"}
                      avatarUrl={user?.imageUrl}
                    />
                  </TabsContent>
                  <TabsContent value="linkedin" className="w-full mt-0">
                    <PostPreview 
                      content={content} 
                      mediaUrls={mediaUrls} 
                      selectedPlatform="linkedin" 
                      username={user?.fullName || "Your Name"}
                      avatarUrl={user?.imageUrl}
                    />
                  </TabsContent>
                </div>

                <div className="mt-8 text-center">
                  <p className="text-xs text-gray-500 italic">
                    * Previews are approximations. Real appearance may vary by platform.
                  </p>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
      <UpgradeModal 
        open={isUpgradeOpen} 
        onOpenChange={setIsUpgradeOpen}
        limitName={limitName}
      />
    </div>
  );
}
