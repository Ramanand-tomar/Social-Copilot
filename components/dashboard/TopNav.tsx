"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

// The old top-nav shipped a non-functional search input and mobile menu
// icon. Both were removed — they looked like features but did nothing,
// which made bug reports confusing. Re-add them only when they're wired up.
export default function TopNav() {
  return (
    <header className="h-20 bg-[#0a0a1a]/80 backdrop-blur-xl border-b border-white/[0.07] flex items-center justify-end px-8 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <Link href="/compose">
          <Button
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-2xl px-6 h-11 flex items-center gap-2 shadow-lg shadow-indigo-600/20 border border-indigo-500/20 transition-all hover:scale-[1.02] active:scale-95 text-sm font-bold"
            suppressHydrationWarning
          >
            <Plus className="w-4 h-4" />
            <span>New Post</span>
          </Button>
        </Link>
      </div>
    </header>
  );
}
