"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Menu, X, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import NotificationBell from "./NotificationBell";
import { SidebarContent } from "./Sidebar";

export default function TopNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="h-16 sm:h-20 bg-[#0a0a1a]/80 backdrop-blur-xl border-b border-white/[0.07] flex items-center justify-between px-4 sm:px-8 sticky top-0 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            className="lg:hidden text-zinc-400 hover:text-white rounded-xl hover:bg-white/[0.05] h-10 w-10 min-h-11 min-w-11"
          >
            <Menu className="w-6 h-6" />
          </Button>

          {/* Logo visible on mobile */}
          <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center">
              <PlusCircle className="text-white w-5 h-5" />
            </div>
            <span className="font-black text-lg tracking-tighter bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              SocialCopilot
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <NotificationBell />

          <Link href="/compose">
            <Button
              className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-2xl px-4 sm:px-6 h-10 sm:h-11 flex items-center gap-2 shadow-lg shadow-indigo-600/20 border border-indigo-500/20 transition-all hover:scale-[1.02] active:scale-95 text-xs sm:text-sm font-bold min-h-11 sm:min-h-11"
              suppressHydrationWarning
            >
              <Plus className="w-4 h-4" />
              <span>New Post</span>
            </Button>
          </Link>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-80 max-w-[85vw] bg-[#0a0a1a] h-full shadow-2xl z-10 flex flex-col animate-in slide-in-from-left duration-200">
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-white/[0.05] z-20"
            >
              <X className="w-6 h-6" />
            </button>
            <SidebarContent onItemClick={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
