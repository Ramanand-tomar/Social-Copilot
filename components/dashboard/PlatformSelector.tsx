"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { platforms, Platform } from "@/lib/social-platforms";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SocialAccount {
  id: string;
  platform: string;
  platformUsername: string;
}

interface PlatformSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** Optional: notified with the platform ids of currently selected accounts. */
  onPlatformsChange?: (platforms: Platform[]) => void;
}

async function fetchAccounts(): Promise<SocialAccount[]> {
  const res = await fetch("/api/accounts");
  if (!res.ok) throw new Error("Failed to load accounts");
  const data = await res.json();
  return data.accounts ?? [];
}

export function PlatformSelector({ selectedIds, onChange, onPlatformsChange }: PlatformSelectorProps) {
  // React Query cache means this is shared across every place that renders
  // the selector in a compose session — no more N fetches per mount.
  const { data: accounts = [], isLoading, isError } = useQuery({
    queryKey: ["accounts"],
    queryFn: fetchAccounts,
    staleTime: 60_000,
  });

  // Keep the parent in sync with which platforms are currently selected.
  useEffect(() => {
    if (!onPlatformsChange) return;
    const selectedPlatforms = accounts
      .filter((a) => selectedIds.includes(a.id))
      .map((a) => a.platform as Platform);
    onPlatformsChange(selectedPlatforms);
  }, [accounts, selectedIds, onPlatformsChange]);

  const toggleAccount = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex gap-2 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 w-24 bg-white/5 rounded-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
        Could not load accounts. Retry from the Accounts page.
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-sm">
        No accounts connected. Please connect accounts in the dashboard first.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {accounts.map((account) => {
        const platform = platforms[account.platform as Platform];
        const isSelected = selectedIds.includes(account.id);

        return (
          <button
            key={account.id}
            onClick={() => toggleAccount(account.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-200",
              isSelected
                ? "bg-indigo-500 border-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:bg-white/10"
            )}
          >
            <div className={cn(
              "w-2 h-2 rounded-full",
              isSelected ? "bg-white" : "bg-indigo-400"
            )} />
            <span className="text-sm font-medium capitalize">{platform?.name || account.platform}</span>
            <span className="text-xs opacity-60">@{account.platformUsername}</span>
            {isSelected && <Check className="w-3 h-3 ml-1" />}
          </button>
        );
      })}
    </div>
  );
}
