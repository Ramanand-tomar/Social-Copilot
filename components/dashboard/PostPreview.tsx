"use client";

import { platforms, Platform } from "@/lib/social-platforms";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Heart, Share2, MoreHorizontal, Globe, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PostPreviewProps {
  content: string;
  mediaUrls: string[];
  selectedPlatform: Platform;
  username?: string;
  avatarUrl?: string;
}

export function PostPreview({ content, mediaUrls, selectedPlatform, username = "Your Profile", avatarUrl }: PostPreviewProps) {
  const platform = platforms[selectedPlatform];

  const renderContent = () => {
    if (!content) return <div className="h-4 w-3/4 bg-white/5 rounded animate-pulse" />;
    return <p className="text-sm whitespace-pre-wrap">{content}</p>;
  };

  const renderMedia = () => {
    if (mediaUrls.length === 0) return null;
    return (
      <div className={cn(
        "mt-3 grid gap-1 rounded-xl overflow-hidden border border-white/10",
        mediaUrls.length > 1 ? "grid-cols-2" : "grid-cols-1"
      )}>
        {mediaUrls.slice(0, 4).map((url, i) => (
          <img key={i} src={url} alt="Preview" className="w-full h-full object-cover aspect-square bg-black/20" />
        ))}
      </div>
    );
  };

  if (selectedPlatform === "twitter") {
    return (
      <div className="bg-black border border-white/10 p-4 rounded-2xl w-full max-w-sm mx-auto font-sans text-white">
        <div className="flex gap-3">
          <Avatar className="w-10 h-10 border border-white/10">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback className="bg-white/5 uppercase">{username[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-bold truncate">{username}</span>
              <span className="text-gray-500 text-sm">@{username.toLowerCase().replace(/\s/g, "")} · 1m</span>
            </div>
            <div className="mt-1">{renderContent()}</div>
            {renderMedia()}
            <div className="flex justify-between mt-4 text-gray-500 max-w-[280px]">
              <MessageCircle className="w-4 h-4" />
              <Share2 className="w-4 h-4 text-emerald-500" />
              <Heart className="w-4 h-4 text-rose-500" />
              <Share2 className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (selectedPlatform === "instagram") {
    return (
      <div className="bg-black border border-white/10 rounded-2xl w-full max-w-sm mx-auto font-sans text-white overflow-hidden">
        <div className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8 p-0.5 bg-gradient-to-tr from-amber-500 to-fuchsia-600">
              <AvatarImage src={avatarUrl} className="rounded-full border-2 border-black" />
              <AvatarFallback className="bg-white/5">{username[0]}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-semibold">{username}</span>
          </div>
          <MoreHorizontal className="w-4 h-4 text-gray-500" />
        </div>
        <div className="aspect-square bg-white/5 flex items-center justify-center border-y border-white/5">
          {mediaUrls.length > 0 ? (
            <img src={mediaUrls[0]} alt="Post" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-12 h-12 text-white/5" />
          )}
        </div>
        <div className="p-4">
          <div className="flex justify-between mb-4">
            <div className="flex gap-4">
              <Heart className="w-6 h-6" />
              <MessageCircle className="w-6 h-6" />
              <Share2 className="w-6 h-6" />
            </div>
            <Badge variant="ghost" className="p-0"><Globe className="w-6 h-6" /></Badge>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">1,234 likes</p>
            <div className="text-sm">
              <span className="font-semibold mr-2">{username}</span>
              {renderContent()}
            </div>
            <p className="text-[10px] text-gray-500 uppercase mt-2">1 minute ago</p>
          </div>
        </div>
      </div>
    );
  }

  // Generic fallback for other platforms
  return (
    <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] w-full max-w-md mx-auto text-white">
      <div className="flex items-center gap-3 mb-4">
        <div className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-wider border border-indigo-500/20">
          {platform?.name || selectedPlatform} Preview
        </div>
      </div>
      <div className="flex gap-4 items-start">
        <Avatar className="w-12 h-12 border border-white/10 rounded-2xl">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback className="bg-white/5">{username[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h4 className="font-bold">{username}</h4>
          <p className="text-xs text-gray-500 mb-4">Posted Just Now</p>
          <div className="text-base leading-relaxed">{renderContent()}</div>
          {renderMedia()}
        </div>
      </div>
    </div>
  );
}
