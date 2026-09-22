"use client";

import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { 
  Copy, 
  Trash2, 
  Sparkles, 
  Crop, 
  Check,
  Zap,
} from "lucide-react";
import { getAITransformedUrl } from "@/lib/imagekit";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface AssetDetailsSheetProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  asset?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (id: string) => void;
}

export const AssetDetailsSheet = ({ 
  asset, 
  open, 
  onOpenChange,
  onDelete 
}: AssetDetailsSheetProps) => {
  const router = useRouter();
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);
  const [activeTransformation, setActiveTransformation] = useState<string>("original");

  // Reset active URL when asset changes
  React.useEffect(() => {
    if (asset) {
      setActiveUrl(asset.url);
      setActiveTransformation("original");
    }
  }, [asset]);

  if (!asset) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeUrl || asset.url);
    setCopying(true);
    toast.success("URL copied to clipboard");
    setTimeout(() => setCopying(false), 2000);
  };

  const applyTransformation = (type: "bg-remove" | "smart-crop" | "auto-enhance" | "original") => {
    setActiveTransformation(type);
    if (type === "original") {
      setActiveUrl(asset.url);
    } else {
      const transformed = getAITransformedUrl(asset.url, type);
      setActiveUrl(transformed);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-zinc-100 overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="text-xl font-bold flex items-center gap-2">
            Asset Details
          </SheetTitle>
          <SheetDescription className="text-zinc-500">
            View metadata and apply AI-powered transformations.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Preview Container */}
          <div className="relative group rounded-2xl overflow-hidden bg-black aspect-square flex items-center justify-center border border-zinc-900 shadow-2xl">
            {asset.fileType === "video" ? (
              <video src={activeUrl || asset.url} controls className="max-h-full max-w-full" />
            ) : (
              <img src={activeUrl || asset.url} alt={asset.altText || asset.name} className="max-h-full max-w-full object-contain" />
            )}
            
            <div className="absolute top-4 right-4 flex gap-2">
              <Badge className="bg-black/60 backdrop-blur-md border-white/10 text-white uppercase text-[10px]">
                {activeTransformation}
              </Badge>
            </div>
          </div>

          {/* AI Transformations */}
          {asset.fileType === "image" && (
            <div className="space-y-3">
              <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                AI Transformations
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => applyTransformation("bg-remove")}
                  className={cn(
                    "bg-zinc-900 border-zinc-800 h-9 transition-all text-xs",
                    activeTransformation === "bg-remove" && "border-indigo-500 bg-indigo-500/10 text-indigo-400"
                  )}
                >
                  Remove BG
                </Button>
                <Button 
                  variant="outline" 
                   size="sm"
                  onClick={() => applyTransformation("smart-crop")}
                  className={cn(
                    "bg-zinc-900 border-zinc-800 h-9 transition-all text-xs",
                    activeTransformation === "smart-crop" && "border-indigo-500 bg-indigo-500/10 text-indigo-400"
                  )}
                >
                  <Crop className="w-3 h-3 mr-2" />
                  Smart 1:1
                </Button>
                <Button 
                  variant="outline" 
                   size="sm"
                  onClick={() => applyTransformation("auto-enhance")}
                  className={cn(
                    "bg-zinc-900 border-zinc-800 h-9 transition-all text-xs",
                    activeTransformation === "auto-enhance" && "border-indigo-500 bg-indigo-500/10 text-indigo-400"
                  )}
                >
                  Auto-Enhance
                </Button>
                <Button 
                  variant="outline" 
                   size="sm"
                  onClick={() => applyTransformation("original")}
                  className={cn(
                    "bg-zinc-900 border-zinc-800 h-9 transition-all text-xs",
                    activeTransformation === "original" && "border-zinc-100 bg-zinc-800"
                  )}
                >
                  Original
                </Button>
              </div>
            </div>
          )}

          <Separator className="bg-zinc-900" />

          {/* Metadata */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-y-4">
              <div className="space-y-1">
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-tight">Filename</p>
                <p className="text-sm text-zinc-200 truncate pr-4">{asset.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-tight">Size</p>
                <p className="text-sm text-zinc-200">{formatSize(asset.size)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-tight">Dimensions</p>
                <p className="text-sm text-zinc-200">1080 x 1350</p> {/* Hardcoded for now, but in real app would be from metadata */}
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-tight">Format</p>
                <p className="text-sm text-zinc-200 uppercase">{asset.mimeType?.split("/")[1] || "PNG"}</p>
              </div>
            </div>

            <div className="space-y-2 p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
               <p className="text-[10px] text-indigo-400 uppercase font-bold tracking-tight flex items-center gap-1.5">
                <Zap className="w-2.5 h-2.5" />
                AI-Generated Alt Text
              </p>
              <p className="text-xs text-zinc-300 leading-relaxed italic">
                {asset.altText || "Analyzing image content..."}
              </p>
            </div>
          </div>

          <Separator className="bg-zinc-900" />

          {/* Actions */}
          <div className="space-y-3">
             <Button 
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-11 rounded-xl"
              onClick={() => router.push(`/compose?mediaUrl=${encodeURIComponent(activeUrl || asset.url)}`)}
            >
              Use in Post
            </Button>
            
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                className="bg-zinc-900 border-zinc-800 h-10 rounded-xl text-zinc-300"
                onClick={handleCopy}
              >
                {copying ? <Check className="w-4 h-4 mr-2 text-emerald-500" /> : <Copy className="w-4 h-4 mr-2" />}
                {copying ? "Copied" : "Copy URL"}
              </Button>
              <Button 
                variant="outline" 
                className="bg-zinc-900 border-zinc-800 h-10 rounded-xl text-rose-500 hover:text-rose-400"
                onClick={() => onDelete(asset.id)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
