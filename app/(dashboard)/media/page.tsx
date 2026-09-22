"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Search, 
  Grid2X2, 
  Image as ImageIcon, 
  Video, 
  HardDrive,
  Loader2,
  CloudUpload,
  Layers
} from "lucide-react";
import { MediaUpload } from "@/components/dashboard/MediaUpload";
import { AssetDetailsSheet } from "@/components/dashboard/AssetDetailsSheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export interface MediaAsset {
  id: string;
  url: string;
  fileId?: string;
  fileName?: string;
  fileType?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  createdAt?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export default function MediaLibraryPage() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (filterType !== "all") params.append("type", filterType);
      
      const res = await fetch(`/api/media?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch media");
      const data = await res.json();
      setAssets(data.assets || []);
      setUsage(data.usage || null);
    } catch {
      toast.error("Error loading media library");
    } finally {
      setLoading(false);
    }
  }, [search, filterType]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMedia();
    }, 500); // Debounce search
    return () => clearTimeout(timer);
  }, [fetchMedia]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this asset?")) return;
    
    try {
      const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      
      setAssets(assets.filter(a => a.id !== id));
      setIsDetailsOpen(false);
      toast.success("Asset deleted");
      // Refresh usage stats
      fetchMedia();
    } catch {
      toast.error("Failed to delete asset");
    }
  };

  const handleAssetClick = (asset: MediaAsset) => {
    setSelectedAsset(asset);
    setIsDetailsOpen(true);
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return "0 MB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="flex-1 h-full bg-black min-h-screen">
      <div className="max-w-[1400px] mx-auto p-6 lg:p-10 space-y-10">
        
        {/* Header with Search & Stats */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <Layers className="w-8 h-8 text-indigo-400 fill-indigo-400/20" />
              Media Library
            </h1>
            <p className="text-zinc-500 text-sm italic max-w-md">
              Manage your brand assets and use AI to transform them for social media.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
            <Card className="bg-zinc-900 border-zinc-800 w-full sm:w-[320px]">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-zinc-500" />
                    <span className="text-xs font-medium text-zinc-400">Storage Usage</span>
                  </div>
                  <span className="text-xs font-bold text-white">
                    {formatSize(usage?.used)} / {formatSize(usage?.limit)}
                  </span>
                </div>
                <Progress value={usage?.percentage || 0} className="h-1.5 bg-zinc-800" />
              </CardContent>
            </Card>

            <Button 
              onClick={() => setIsUploadOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-12 px-6 rounded-2xl shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all hover:scale-105 w-full sm:w-auto"
            >
              <CloudUpload className="w-5 h-5 mr-2" />
              Upload Media
            </Button>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-[400px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input 
              placeholder="Search by filename..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-zinc-900 border-zinc-800 h-11 rounded-xl focus:border-indigo-500/50"
            />
          </div>

          <div className="flex items-center gap-2 bg-zinc-900 rounded-xl p-1 border border-zinc-800 w-full md:w-auto overflow-x-auto">
            {[
              { id: "all", label: "All Assets", icon: Grid2X2 },
              { id: "image", label: "Images", icon: ImageIcon },
              { id: "video", label: "Videos", icon: Video },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                  filterType === tab.id 
                    ? "bg-indigo-600 text-white shadow-lg" 
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Media Grid */}
        {loading && assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
            <p className="text-zinc-500 text-sm animate-pulse">Syncing library...</p>
          </div>
        ) : assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40 bg-zinc-900/40 border border-zinc-800 border-dashed rounded-[3rem] text-center gap-6">
            <div className="h-20 w-20 rounded-[2rem] bg-zinc-800/50 flex items-center justify-center text-zinc-600">
               <ImageIcon className="h-10 w-10" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-zinc-300">Your library is empty</h3>
              <p className="text-zinc-500 text-sm mt-2 max-w-xs mx-auto">
                Start by uploading some images or videos to use in your social media posts.
              </p>
            </div>
            <Button 
                variant="outline" 
                onClick={() => setIsUploadOpen(true)}
                className="border-zinc-800 text-zinc-400 hover:bg-zinc-800 rounded-xl"
              >
                Upload your first asset
              </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
            {assets.map((asset) => (
              <Card 
                key={asset.id} 
                className="bg-zinc-900 border-zinc-800 cursor-pointer group hover:border-indigo-500/50 transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(79,70,229,0.15)] overflow-hidden rounded-2xl"
                onClick={() => handleAssetClick(asset)}
              >
                <div className="aspect-square relative flex items-center justify-center bg-black">
                  <img 
                    src={asset.thumbnailUrl || asset.url} 
                    alt={asset.name} 
                    className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                  />
                  {asset.fileType === "video" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="p-2 bg-black/60 rounded-full backdrop-blur-sm">
                        <Video className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  )}
                  {/* Overlay Actions */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                    <p className="text-[10px] text-white font-bold truncate">{asset.name}</p>
                    <p className="text-[8px] text-zinc-400 uppercase tracking-widest">{formatSize(asset.size)}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Upload Dialog Container (Custom Modal) */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="sm:max-w-2xl bg-zinc-950 border-zinc-900 p-0 overflow-hidden rounded-[2.5rem]">
           <div className="p-10 space-y-6">
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                   <CloudUpload className="w-7 h-7 text-indigo-400" />
                   Add Media Assets
                </h3>
                <p className="text-zinc-500 text-sm">Upload images and videos to your centralized brand library.</p>
              </div>
              <MediaUpload 
                onUploadComplete={(urls) => {
                  fetchMedia();
                  setIsUploadOpen(false);
                  toast.success(`${urls.length} file(s) uploaded successfully!`);
                }} 
              />
           </div>
        </DialogContent>
      </Dialog>

      <AssetDetailsSheet 
        asset={selectedAsset}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        onDelete={handleDelete}
      />
    </div>
  );
}
