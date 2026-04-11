"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, 
  Settings2, 
  MessageSquare, 
  Trash2, 
  Zap, 
  Loader2, 
  RefreshCcw,
  Sparkles,
  MousePointerClick,
  Activity
} from "lucide-react";
import { RuleEditorModal } from "@/components/dashboard/RuleEditorModal";
import { UpgradeModal } from "@/components/dashboard/UpgradeModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AutoReplyPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [limitName, setLimitName] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auto-reply");
      if (!res.ok) throw new Error("Failed to fetch rules");
      const data = await res.json();
      setRules(data.rules || []);
    } catch (error) {
      toast.error("Error loading rules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const toggleRuleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/auto-reply/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      if (!res.ok) throw new Error("Failed to toggle status");
      
      setRules(rules.map(r => r.id === id ? { ...r, isActive: !currentStatus } : r));
      toast.success(`Rule ${!currentStatus ? "activated" : "deactivated"}`);
    } catch (error) {
      toast.error("Failed to update rule status");
    }
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    try {
      const res = await fetch(`/api/auto-reply/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete rule");

      setRules(rules.filter((r) => r.id !== id));
      toast.success("Rule deleted");
    } catch {
      toast.error("Failed to delete rule");
    }
  };

  const handleEdit = (rule: any) => {
    setEditingRule(rule);
    setIsModalOpen(true);
  };

  const totalReplies = rules.reduce((acc, curr) => acc + (curr.replyCount || 0), 0);

  return (
    <div className="flex-1 h-full">
      <div className="max-w-[1400px] mx-auto p-6 lg:p-10 space-y-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <Zap className="w-8 h-8 text-indigo-400 fill-indigo-400/20" />
              Auto Reply System
            </h1>
            <p className="text-zinc-500 text-sm italic max-w-md">
              Automatically respond to comments using AI intelligence or custom templates.
            </p>
          </div>
          
          <Button 
            onClick={() => { setEditingRule(null); setIsModalOpen(true); }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-12 px-6 rounded-2xl shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all hover:scale-105"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create New Rule
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                <Activity className="h-6 w-6 text-indigo-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Total Active Rules</p>
                <p className="text-2xl font-bold text-white">{rules.filter(r => r.isActive).length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Total Replies Sent</p>
                <p className="text-2xl font-bold text-white">{totalReplies}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">AI Automation Rate</p>
                <p className="text-2xl font-bold text-white">
                  {rules.length > 0 ? Math.round((rules.filter(r => r.isAi).length / rules.length) * 100) : 0}%
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rules List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-300">Automation Rules</h2>
            <button onClick={fetchRules} className="text-zinc-500 hover:text-white flex items-center gap-1.5 text-xs transition-colors">
              <RefreshCcw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              Sync Rules
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/50 border border-zinc-800 border-dashed rounded-[2.5rem] gap-4">
              <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
              <p className="text-zinc-500 text-sm">Loading your rule engine...</p>
            </div>
          ) : rules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/50 border border-zinc-800 border-dashed rounded-[2.5rem] gap-6 text-center">
              <div className="h-16 w-16 rounded-3xl bg-zinc-800/50 flex items-center justify-center">
                <MousePointerClick className="h-8 w-8 text-zinc-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-zinc-300">No active rules</h3>
                <p className="text-zinc-500 text-sm mt-1 max-w-xs mx-auto">
                  Create your first automation rule to start replying to comments instantly.
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => setIsModalOpen(true)}
                className="border-zinc-800 text-zinc-400 hover:bg-zinc-800"
              >
                Set up first rule
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {rules.map((rule) => (
                <Card key={rule.id} className={cn(
                  "bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all group overflow-hidden relative",
                  !rule.isActive && "opacity-60"
                )}>
                  <div className={cn(
                    "absolute top-0 left-0 w-1.5 h-full",
                    rule.isActive ? "bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]" : "bg-zinc-800"
                  )} />
                  
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                          {rule.name}
                          {rule.isAi && <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                        </CardTitle>
                        <CardDescription className="text-zinc-500 flex items-center gap-2 text-xs">
                          {rule.triggerType === "all" ? (
                            "All incoming comments"
                          ) : (
                            <span className="flex items-center gap-1">
                              Matches: {rule.keywords?.slice(0, 3).join(", ")}{rule.keywords?.length > 3 && ` +${rule.keywords.length - 3}`}
                            </span>
                          )}
                        </CardDescription>
                      </div>
                      <Switch 
                        checked={rule.isActive} 
                        onCheckedChange={() => toggleRuleStatus(rule.id, rule.isActive)} 
                      />
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-5">
                    <div className="p-4 bg-black/40 border border-zinc-800 rounded-2xl relative">
                      <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <MessageSquare className="h-3 w-3" />
                        Reply logic
                      </p>
                      <p className="text-zinc-300 text-sm line-clamp-2 italic leading-relaxed">
                        {rule.isAi ? `[AI] ${rule.aiPrompt}` : rule.responseContent}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex gap-2">
                        <Badge variant="outline" className="bg-zinc-950 border-zinc-800 text-[10px] h-6 px-2 text-zinc-400">
                          {rule.selectedAccounts?.length} Accounts
                        </Badge>
                        <Badge variant="outline" className="bg-indigo-500/5 border-indigo-500/10 text-[10px] h-6 px-2 text-indigo-400">
                          {rule.replyCount} Replies
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white" onClick={() => handleEdit(rule)}>
                          <Settings2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-rose-500" onClick={() => setPendingDeleteId(rule.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <RuleEditorModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
        rule={editingRule}
        onSaved={fetchRules}
        onLimitReached={(name) => {
          setLimitName(name);
          setIsUpgradeOpen(true);
        }}
      />

      <UpgradeModal
        open={isUpgradeOpen}
        onOpenChange={setIsUpgradeOpen}
        limitName={limitName}
      />

      <AlertDialog
        open={!!pendingDeleteId}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this rule?</AlertDialogTitle>
            <AlertDialogDescription>
              This auto-reply rule and its reply history will be removed. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-rose-600 hover:bg-rose-500 text-white"
            >
              Delete rule
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
