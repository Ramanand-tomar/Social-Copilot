"use client";

import { useState } from "react";
import { ImageKitProvider, IKUpload } from "imagekitio-next";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, X, Sparkles, Crop, Wand2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getAITransformedUrl } from "@/lib/imagekit";

export interface MediaAssetItem {
  id: string;
  url: string;
  imageKitFileId: string;
  name?: string | null;
  mimeType?: string | null;
}

interface ImageKitUploadResponse {
  fileId: string;
  name: string;
  url: string;
  size: number;
}

interface MediaUploadProps {
  urls?: string[];
  onChange?: (urls: string[]) => void;
  onUploadComplete?: (assets: MediaAssetItem[]) => void;
}

export function MediaUpload({ urls = [], onChange, onUploadComplete }: MediaUploadProps) {
  const [uploading, setUploading] = useState(false);

  const authenticator = async () => {
    try {
      const response = await fetch("/api/media/upload-auth");
      if (!response.ok) throw new Error("Authentication failed");
      return await response.json();
    } catch {
      throw new Error("Could not authenticate with ImageKit");
    }
  };

  const onSuccess = async (res: ImageKitUploadResponse) => {
    try {
      const dbRes = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageKitFileId: res.fileId,
        }),
      });

      if (!dbRes.ok) throw new Error("Failed to save to database");

      const newAsset: MediaAssetItem = await dbRes.json();

      if (onChange) onChange([...urls, newAsset.url]);
      if (onUploadComplete) onUploadComplete([newAsset]);

      toast.success("File uploaded and saved to library");
    } catch {
      toast.error("File uploaded but failed to save to database");
    } finally {
      setUploading(false);
    }
  };

  const onError = () => {
    setUploading(false);
    toast.error("Upload failed");
  };

  const onUploadStart = () => {
    setUploading(true);
  };

  const removeMedia = (url: string) => {
    if (onChange) {
      onChange(urls.filter((u) => u !== url));
    }
  };

  const applyAITransform = (index: number, type: "bg-remove" | "smart-crop" | "auto-enhance") => {
    const newUrl = getAITransformedUrl(urls[index], type);
    const newUrls = [...urls];
    newUrls[index] = newUrl;
    if (onChange) {
      onChange(newUrls);
    }
    toast.info(`Applying ${type}... Image URL updated with transformation.`);
  };

  return (
    <ImageKitProvider
      publicKey={process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY}
      urlEndpoint={process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT}
      authenticator={authenticator}
    >
      <div className="space-y-6">
        <label className="block p-8 border-2 border-dashed border-white/10 rounded-3xl hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all cursor-pointer group text-center relative overflow-hidden">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
              {uploading ? <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /> : <ImageIcon className="w-6 h-6 text-zinc-400" />}
            </div>
            <div>
              <p className="text-sm font-medium text-white">Click or drag images/video</p>
              <p className="text-xs text-zinc-500 mt-1">Supports PNG, JPG, GIF, MP4 (Max 10MB)</p>
            </div>
          </div>
          <IKUpload
            fileName="social_post"
            useUniqueFileName={true}
            onSuccess={onSuccess as unknown as (res: unknown) => void}
            onError={onError}
            onUploadStart={onUploadStart}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </label>

        {urls.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {urls.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-2xl border border-white/10 overflow-hidden group bg-black/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="Upload" className="w-full h-full object-cover" />

                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="bg-white/10 hover:bg-white/20 text-white rounded-lg h-8 w-8"
                      title="AI BG Remove"
                      onClick={() => applyAITransform(i, "bg-remove")}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="bg-white/10 hover:bg-white/20 text-white rounded-lg h-8 w-8"
                      title="AI Smart Crop (1:1)"
                      onClick={() => applyAITransform(i, "smart-crop")}
                    >
                      <Crop className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="bg-white/10 hover:bg-white/20 text-white rounded-lg h-8 w-8"
                      title="AI Auto Enhance"
                      onClick={() => applyAITransform(i, "auto-enhance")}
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-7 px-3 text-[10px] rounded-lg"
                    onClick={() => removeMedia(url)}
                  >
                    <X className="w-3 h-3 mr-1" /> Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ImageKitProvider>
  );
}
