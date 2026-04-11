"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";

interface AIWriterDialogProps {
  onGenerate: (content: string) => void;
  /** Hard character limit of the strictest selected platform, if any. */
  maxChars?: number;
}

export function AIWriterDialog({ onGenerate, maxChars }: AIWriterDialogProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "write", prompt, maxChars }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate content");
      }
      if (data.content) {
        const clipped =
          typeof maxChars === "number" && data.content.length > maxChars
            ? data.content.slice(0, maxChars)
            : data.content;
        onGenerate(clipped);
        setOpen(false);
        setPrompt("");
        toast.success("Content generated successfully!");
      } else {
        throw new Error("No content returned");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" className="gap-2 border-indigo-500/30 bg-indigo-500/5 text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-500/50" />}>
        <Sparkles className="w-4 h-4" />
        AI Write
      </DialogTrigger>
      <DialogContent className="bg-[#0a0a1a] border-white/10 text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-indigo-400" />
            Write with AI
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Tell the AI what you want to post about, and it will draft a high-converting post for you.
          </DialogDescription>
        </DialogHeader>
        <div className="py-6">
          <Textarea
            placeholder="e.g., Write a post announcing our new summer collection... Or share a tip about social media growth."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[120px] bg-white/5 border-white/10 focus:border-indigo-500/50 transition-all resize-none"
          />
        </div>
        <DialogFooter>
          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Post Content"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
