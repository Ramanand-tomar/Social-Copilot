"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Sparkles, Zap, Target } from "lucide-react";
import { PlatformSelector } from "./PlatformSelector";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RuleEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rule?: any;
  onSaved: () => void;
  onLimitReached?: (limitName: string) => void;
}

export const RuleEditorModal = ({ open, onOpenChange, rule, onSaved, onLimitReached }: RuleEditorModalProps) => {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState<"keywords" | "all">("keywords");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [isAi, setIsAi] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [responseContent, setResponseContent] = useState("");
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);

  useEffect(() => {
    if (rule) {
      setName(rule.name || "");
      setTriggerType(rule.triggerType || "keywords");
      setKeywords(rule.keywords || []);
      setIsAi(rule.isAi || false);
      setAiPrompt(rule.aiPrompt || "");
      setResponseContent(rule.responseContent || "");
      setSelectedAccountIds(rule.selectedAccounts || []);
    } else {
      // Reset
      setName("");
      setTriggerType("keywords");
      setKeywords([]);
      setIsAi(false);
      setAiPrompt("");
      setResponseContent("");
      setSelectedAccountIds([]);
    }
  }, [rule, open]);

  const handleAddKeyword = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && keywordInput.trim()) {
      e.preventDefault();
      if (!keywords.includes(keywordInput.trim())) {
        setKeywords([...keywords, keywordInput.trim()]);
      }
      setKeywordInput("");
    }
  };

  const removeKeyword = (kw: string) => {
    setKeywords(keywords.filter((k) => k !== kw));
  };

  const handleSave = async () => {
    if (!name) return toast.error("Rule name is required");
    if (triggerType === "keywords" && keywords.length === 0) return toast.error("Add at least one keyword");
    if (selectedAccountIds.length === 0) return toast.error("Select at least one account");

    setLoading(true);
    try {
      const url = rule ? `/api/auto-reply/${rule.id}` : "/api/auto-reply";
      const method = rule ? "PATCH" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          triggerType,
          keywords,
          isAi,
          aiPrompt: isAi ? aiPrompt : null,
          responseContent: !isAi ? responseContent : null,
          selectedAccounts: selectedAccountIds,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 403 && data.error === "limit_reached") {
          if (onLimitReached) onLimitReached(data.limitName || "Rules");
          onOpenChange(false);
          return;
        }
        throw new Error(data.error || "Failed to save rule");
      }

      toast.success(rule ? "Rule updated" : "Rule created successfully!");
      onSaved();
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-zinc-950 border-zinc-800 text-zinc-100 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6 text-indigo-400" />
            {rule ? "Edit Auto-Reply Rule" : "Create Auto-Reply Rule"}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Automate your engagement with AI or custom templates.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Rule Name */}
          <div className="space-y-2">
            <Label className="text-zinc-400">Rule Name</Label>
            <Input 
              placeholder="e.g., Pricing Inquiry Support" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              className="bg-zinc-900 border-zinc-800 focus:border-indigo-500/50"
            />
          </div>

          {/* Account Selection */}
          <div className="space-y-3">
            <Label className="text-zinc-400">Target Accounts</Label>
            <PlatformSelector selectedIds={selectedAccountIds} onChange={setSelectedAccountIds} />
          </div>

          {/* Trigger Section */}
          <div className="space-y-4 pt-2 border-t border-zinc-900">
            <div className="flex items-center justify-between">
              <Label className="text-zinc-200 font-semibold flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-400" />
                Trigger Condition
              </Label>
              <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                <button 
                  onClick={() => setTriggerType("keywords")}
                  className={cn(
                    "px-3 py-1 text-xs rounded-md transition-all",
                    triggerType === "keywords" ? "bg-indigo-600 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  Keywords
                </button>
                <button 
                  onClick={() => setTriggerType("all")}
                  className={cn(
                    "px-3 py-1 text-xs rounded-md transition-all",
                    triggerType === "all" ? "bg-indigo-600 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  All Comments
                </button>
              </div>
            </div>

            {triggerType === "keywords" && (
              <div className="space-y-3">
                <Input 
                  placeholder="Type a keyword and press Enter..." 
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={handleAddKeyword}
                  className="bg-zinc-900 border-zinc-800"
                />
                <div className="flex flex-wrap gap-2">
                  {keywords.map((kw) => (
                    <Badge key={kw} variant="secondary" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 px-2 py-1 flex items-center gap-1">
                      {kw}
                      <X className="w-3 h-3 cursor-pointer hover:text-indigo-200" onClick={() => removeKeyword(kw)} />
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Response Section */}
          <div className="space-y-4 pt-2 border-t border-zinc-900">
            <div className="flex items-center justify-between bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-lg">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-200">AI-Powered Replies</p>
                  <p className="text-xs text-zinc-500">Generate context-aware responses using Gemini</p>
                </div>
              </div>
              <Switch checked={isAi} onCheckedChange={setIsAi} />
            </div>

            {isAi ? (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <Label className="text-zinc-400">AI Personality Prompt</Label>
                <Textarea 
                  placeholder="Instruct the AI on how to reply (e.g., 'Be helpful, professional, and mention our summer sale.')"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 h-24"
                />
              </div>
            ) : (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <Label className="text-zinc-400 flex items-center justify-between">
                  Response Template
                  <span className="text-[10px] text-zinc-500 normal-case">Use {"{{commenter}}"} for mentions</span>
                </Label>
                <Textarea 
                  placeholder="Hey {{commenter}}, thanks for the feedback!"
                  value={responseContent}
                  onChange={(e) => setResponseContent(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 h-24"
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-zinc-900 pt-6">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-zinc-400 hover:text-white">
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-8"
          >
            {loading ? "Saving..." : rule ? "Update Rule" : "Create Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
