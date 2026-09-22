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
  Activity,
  ListFilter,
  CheckCircle2,
  XCircle
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface AutoReplyRule {
  id: string;
  name: string;
  triggerType?: string;
  keywords?: string[];
  matchType?: string;
  replyTemplate?: string;
  platform?: string;
  isEnabled?: boolean;
  replyCount?: number;
  aiEnabled?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface AutoReplyLogItem {
  id: string;
  ruleId?: string;
  platform?: string;
  triggerText?: string;
  replyText?: string;
  status?: string;
  errorMessage?: string;
  createdAt?: string;
  ruleName?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export default function AutoReplyPage() {
  const [activeTab, setActiveTab] = useState<"rules" | "logs">("rules");
  const [rules, setRules] = useState<AutoReplyRule[]>([]);
  const [logs, setLogs] = useState<AutoReplyLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutoReplyRule | null>(null);
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
    } catch {
      toast.error("Error loading rules");
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch("/api/auto-reply/logs?limit=50");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch {
      toast.error("Error loading logs");
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchRules();

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") === "logs") {
        setActiveTab("logs");
        fetchLogs();
      }
    }
  }, []);

  const handleTabChange = (tab: "rules" | "logs") => {
    setActiveTab(tab);
    if (tab === "logs") {
      fetchLogs();
    }
  };

  const toggleRuleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/auto-reply/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      if (!res.ok) throw new Error("Failed to toggle status");
      
      setRules(rules.map((r) => (r.id === id ? { ...r, isActive: !currentStatus } : r)));
      toast.success(`Rule ${!currentStatus ? "activated" : "deactivated"}`);
    } catch {
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

  const handleEdit = (rule: AutoReplyRule) => {
    setEditingRule(rule);
    setIsModalOpen(true);
  };

  const totalReplies = rules.reduce((acc, curr) => acc + (curr.replyCount || 0), 0);

  return (
    <div className="flex-1 h-full min-w-0">
      <div className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-10 space-y-8 min-w-0">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <Zap className="w-7 h-7 text-indigo-400 fill-indigo-400/20 shrink-0" />
              <span>Auto Reply System</span>
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm">
              Automatically respond to comments using AI intelligence or custom templates.
            </p>
          </div>
          
          <Button 
            onClick={() => { setEditingRule(null); setIsModalOpen(true); }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-11 sm:h-12 px-5 sm:px-6 rounded-2xl shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all hover:scale-[1.02] text-xs sm:text-sm w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            <span>Create New Rule</span>
          </Button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/10 gap-6">
          <button
            onClick={() => handleTabChange("rules")}
            className={cn(
              "pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2",
              activeTab === "rules"
                ? "border-indigo-500 text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Settings2 className="w-4 h-4" />
            <span>Rules ({rules.length})</span>
          </button>
          <button
            onClick={() => handleTabChange("logs")}
            className={cn(
              "pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2",
              activeTab === "logs"
                ? "border-indigo-500 text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            )}
          >
            <ListFilter className="w-4 h-4" />
            <span>Reply Logs</span>
          </button>
        </div>

        {activeTab === "rules" ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                    <Activity className="h-6 w-6 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Active Rules</p>
                    <p className="text-2xl font-bold text-white">{rules.filter((r) => r.isActive).length}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0">
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
                  <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Sparkles className="h-6 w-6 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">AI Automation Rate</p>
                    <p className="text-2xl font-bold text-white">
                      {rules.length > 0 ? Math.round((rules.filter((r) => r.isAi).length / rules.length) * 100) : 0}%
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
                  <span>Sync Rules</span>
                </button>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/50 border border-zinc-800 border-dashed rounded-3xl gap-4">
                  <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                  <p className="text-zinc-500 text-sm">Loading your rule engine...</p>
                </div>
              ) : rules.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/50 border border-zinc-800 border-dashed rounded-3xl gap-6 text-center">
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
                                    Matches: {rule.keywords?.slice(0, 3).join(", ")}{(rule.keywords?.length ?? 0) > 3 && ` +${(rule.keywords?.length ?? 0) - 3}`}
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
          </>
        ) : (
          /* Logs View */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-300">Reply History Logs</h2>
              <button onClick={fetchLogs} className="text-zinc-500 hover:text-white flex items-center gap-1.5 text-xs transition-colors">
                <RefreshCcw className={cn("h-3.5 w-3.5", loadingLogs && "animate-spin")} />
                <span>Refresh Logs</span>
              </button>
            </div>

            {loadingLogs ? (
              <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/50 border border-zinc-800 border-dashed rounded-3xl gap-4">
                <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                <p className="text-zinc-500 text-sm">Loading activity logs...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 bg-zinc-900/50 border border-zinc-800 border-dashed rounded-3xl text-center p-6">
                <ListFilter className="h-8 w-8 text-zinc-600 mb-3" />
                <h3 className="text-lg font-bold text-zinc-300">No reply logs yet</h3>
                <p className="text-zinc-500 text-xs mt-1">Logs will appear automatically when rules respond to comments.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => (
                  <div key={log.id} className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize text-[10px] bg-white/5 border-white/10 text-zinc-300">
                          {log.platform}
                        </Badge>
                        <span className="font-semibold text-white truncate">{log.rule?.name || "Auto Reply"}</span>
                        <span className="text-zinc-500 text-[10px]">
                          {new Date(log.createdAt || Date.now()).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-zinc-400 truncate">
                        Comment: &quot;{log.commentText || "N/A"}&quot;
                      </p>
                      <p className="text-indigo-400 font-medium truncate">
                        Replied: &quot;{log.response}&quot;
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5">
                      {log.status === "success" ? (
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-0 flex items-center gap-1 text-[10px]">
                          <CheckCircle2 className="w-3 h-3" />
                          Success
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500/10 text-red-400 border-0 flex items-center gap-1 text-[10px]">
                          <XCircle className="w-3 h-3" />
                          Failed
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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
