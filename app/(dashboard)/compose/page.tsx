"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import { 
  Calendar, 
  Clock, 
  Sparkles, 
  Eye, 
  Layout,
  MessageSquare,
  Smile,
  Loader2,
  ChevronRight,
  ShieldCheck,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getStrictestContentLimit, Platform } from "@/lib/social-platforms";
import { useUpgradeModal } from "@/components/ui/UpgradeModal";
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
  return (
    <Suspense fallback={null}>
      <ComposePageInner />
    </Suspense>
  );
}

function ComposePageInner() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const { openUpgradeModal } = useUpgradeModal();

  const editingPostId = searchParams.get("id");
  const prefillMediaUrl = searchParams.get("mediaUrl");

  const [content, setContent] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [isScheduling, setIsScheduling] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [hydratingFromQuery, setHydratingFromQuery] = useState<boolean>(!!editingPostId);

  useEffect(() => {
    let cancelled = false;

    if (editingPostId) {
      (async () => {
        try {
          const res = await fetch(`/api/posts?limit=200`);
          if (!res.ok) throw new Error("Failed to load post");
          const data = await res.json();
          const post = (data.posts ?? []).find((p: Record<string, unknown>) => p.id === editingPostId);
          if (!post || cancelled) return;

          setContent(typeof post.content === "string" ? post.content : "");
          setMediaUrls(Array.isArray(post.mediaUrls) ? (post.mediaUrls as string[]) : []);
          setSelectedAccountIds(
            Array.isArray(post.selectedAccounts) ? (post.selectedAccounts as string[]) : [],
          );

          if (post.scheduledAt) {
            const d = new Date(post.scheduledAt as string);
            const pad = (n: number) => String(n).padStart(2, "0");
            const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
              d.getDate(),
            )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
            setScheduledAt(local);
            setIsScheduling(true);
          }
        } catch (err: unknown) {
          toast.error((err as Error)?.message ?? "Failed to load post for editing");
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
  }, [editingPostId, prefillMediaUrl]);

  const contentLimit = getStrictestContentLimit(selectedPlatforms);
  const overLimit = content.length > contentLimit;

  const handleSaveDraft = async () => {
    if (!content && mediaUrls.length === 0) {
      toast.error("Add some content or media to save as draft");
      return;
    }

    setSavingDraft(true);
    try {
      const endpoint = editingPostId ? `/api/posts/${editingPostId}` : "/api/posts";
      const method = editingPostId ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          mediaUrls,
          accountIds: selectedAccountIds,
          status: "draft",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to save draft");
      }

      toast.success("Draft saved successfully!");
      await queryClient.invalidateQueries({ queryKey: ["posts"] });
    } catch (error: unknown) {
      toast.error((error as Error).message || "Failed to save draft");
    } finally {
      setSavingDraft(false);
    }
  };

  const handlePublish = async (isScheduled: boolean) => {
    if (!content && mediaUrls.length === 0) {
      toast.error("Add some content or media to publish");
      return;
    }

    if (selectedAccountIds.length === 0) {
      toast.error("Select at least one social account");
      return;
    }

    if (overLimit) {
      toast.error("Post content exceeds character limits for selected platforms");
      return;
    }

    if (isScheduled && !scheduledAt) {
      toast.error("Please pick a scheduled date and time");
      return;
    }

    setPublishing(true);

    try {
      const endpoint = editingPostId ? `/api/posts/${editingPostId}` : "/api/posts";
      const method = editingPostId ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          mediaUrls,
          accountIds: selectedAccountIds,
          scheduledAt: isScheduled ? new Date(scheduledAt).toISOString() : null,
          intent: isScheduled ? "schedule" : "publish_now",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.upgradeRequired) {
          openUpgradeModal(data.limitName || "Plan limit reached");
          return;
        }
        throw new Error(data.message || "Failed to publish post");
      }

      toast.success(
        isScheduled ? "Post scheduled successfully!" : "Post published successfully!",
      );
      await queryClient.invalidateQueries({ queryKey: ["posts"] });

      setContent("");
      setMediaUrls([]);
      setSelectedAccountIds([]);
      setScheduledAt("");
    } catch (error: unknown) {
      toast.error((error as Error).message || "Failed to publish post");
    } finally {
      setPublishing(false);
    }
  };

  const onEmojiClick = (emojiData: { emoji: string }) => {
    setContent((prev) => prev + emojiData.emoji);
    setShowEmoji(false);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto min-h-screen lg:min-h-0 lg:h-[calc(100vh-6rem)]">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 lg:h-full">
        {/* Left Column: Editor (7 cols) */}
        <div className="lg:col-span-7 space-y-6 lg:overflow-y-auto lg:pr-4 scrollbar-hide">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <Layout className="w-7 h-7 text-indigo-400" />
              <span>Compose Post</span>
            </h1>
            <AIWriterDialog
              onGenerate={(text) => setContent(text)}
              maxChars={contentLimit}
            />
          </div>

          <Card className="bg-white/5 border-white/10 rounded-3xl sm:rounded-[2.5rem] overflow-hidden">
            <CardContent className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
              {/* Account Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Select Channels</span>
                </label>
                <PlatformSelector
                  selectedIds={selectedAccountIds}
                  onChange={setSelectedAccountIds}
                  onPlatformsChange={setSelectedPlatforms}
                />
              </div>

              {/* Text Content */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label htmlFor="compose-textarea" className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-400" />
                    <span>Content</span>
                  </label>
                  <div className="flex items-center gap-4">
                    <button 
                      type="button"
                      onClick={() => setShowEmoji(!showEmoji)}
                      aria-label="Insert emoji"
                      className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg"
                    >
                      <Smile className="w-5 h-5" />
                    </button>
                    <span className={cn(
                      "text-xs font-mono",
                      overLimit ? "text-rose-400 font-bold" : "text-gray-400"
                    )}>
                      {content.length} / {contentLimit}
                    </span>
                  </div>
                </div>
                
                <div className="relative">
                  <textarea
                    id="compose-textarea"
                    aria-label="Post content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="What's on your mind? Start typing or use AI Write..."
                    className="w-full min-h-[180px] sm:min-h-[220px] bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6 text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500/50 transition-all text-base sm:text-lg leading-relaxed resize-none min-w-0"
                  />
                  {showEmoji && (
                    <div className="absolute top-12 right-0 z-50 shadow-2xl">
                      <EmojiPicker onEmojiClick={onEmojiClick} theme={Theme.DARK} />
                    </div>
                  )}
                </div>
              </div>

              {/* Media Upload */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <span>Media Gallery</span>
                </label>
                <MediaUpload urls={mediaUrls} onChange={setMediaUrls} />
              </div>

              {/* Action Bar */}
              <div className="pt-6 border-t border-white/5 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <button 
                      type="button"
                      onClick={() => setIsScheduling(!isScheduling)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2.5 sm:px-6 sm:py-3 rounded-2xl border transition-all text-xs sm:text-sm font-semibold min-h-11",
                        isScheduling 
                          ? "bg-indigo-500/15 border-indigo-500 text-indigo-300" 
                          : "bg-white/5 border-white/10 text-gray-300 hover:border-white/20"
                      )}
                    >
                      <Calendar className="w-4 h-4" />
                      <span>{isScheduling ? "Schedule Mode Active" : "Schedule for Later"}</span>
                    </button>
                    
                    {isScheduling && (
                      <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-3 py-2 w-full sm:w-auto min-h-11 min-w-0">
                        <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
                        <input 
                          type="datetime-local" 
                          value={scheduledAt}
                          onChange={(e) => setScheduledAt(e.target.value)}
                          className="bg-transparent text-xs sm:text-sm text-white border-none focus:ring-0 outline-none min-w-0 w-full"
                          aria-label="Select date and time for scheduling"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSaveDraft}
                      disabled={savingDraft || publishing || hydratingFromQuery}
                      className="flex-1 sm:flex-none border-white/10 text-gray-300 hover:text-white rounded-2xl h-11 px-5 text-sm font-semibold min-h-11"
                    >
                      {savingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      <span>Save Draft</span>
                    </Button>

                    <Button
                      type="button"
                      onClick={() => handlePublish(isScheduling)}
                      disabled={publishing || savingDraft || overLimit || hydratingFromQuery}
                      className="flex-1 sm:flex-none px-6 sm:px-8 h-11 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 min-h-11"
                    >
                      {publishing ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <span>{isScheduling ? "Schedule Post" : "Post Now"}</span>
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Previews (5 cols) */}
        <div className="lg:col-span-5 lg:h-full flex flex-col space-y-4">
          <div className="flex items-center gap-3 px-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-indigo-400" />
              <span>Live Previews</span>
            </h2>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <Card className="bg-white/5 border-white/10 rounded-3xl sm:rounded-[2.5rem] flex-1 overflow-hidden min-w-0">
            <CardContent className="p-4 sm:p-6 lg:p-8 h-full flex flex-col min-w-0">
              <Tabs defaultValue="twitter" className="h-full flex flex-col min-w-0">
                <TabsList className="bg-white/5 border border-white/10 p-1 rounded-2xl mb-6 grid grid-cols-3 w-full">
                  <TabsTrigger value="twitter" className="rounded-xl data-[state=active]:bg-indigo-500 data-[state=active]:text-white transition-all text-xs font-semibold">Twitter</TabsTrigger>
                  <TabsTrigger value="instagram" className="rounded-xl data-[state=active]:bg-indigo-500 data-[state=active]:text-white transition-all text-xs font-semibold">Instagram</TabsTrigger>
                  <TabsTrigger value="linkedin" className="rounded-xl data-[state=active]:bg-indigo-500 data-[state=active]:text-white transition-all text-xs font-semibold">LinkedIn</TabsTrigger>
                </TabsList>

                <div className="flex-1 flex items-center justify-center p-2 sm:p-4 min-w-0">
                  <TabsContent value="twitter" className="w-full mt-0 min-w-0">
                    <PostPreview 
                      content={content} 
                      mediaUrls={mediaUrls} 
                      selectedPlatform="twitter" 
                      username={user?.fullName || "Your Name"}
                      avatarUrl={user?.imageUrl}
                    />
                  </TabsContent>
                  <TabsContent value="instagram" className="w-full mt-0 min-w-0">
                    <PostPreview 
                      content={content} 
                      mediaUrls={mediaUrls} 
                      selectedPlatform="instagram" 
                      username={user?.fullName || "Your Name"}
                      avatarUrl={user?.imageUrl}
                    />
                  </TabsContent>
                  <TabsContent value="linkedin" className="w-full mt-0 min-w-0">
                    <PostPreview 
                      content={content} 
                      mediaUrls={mediaUrls} 
                      selectedPlatform="linkedin" 
                      username={user?.fullName || "Your Name"}
                      avatarUrl={user?.imageUrl}
                    />
                  </TabsContent>
                </div>

                <div className="mt-4 text-center">
                  <p className="text-[11px] text-gray-400 italic">
                    * Previews are approximations. Real appearance may vary by platform.
                  </p>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
