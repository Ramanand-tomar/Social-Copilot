"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Calendar,
  BarChart3,
  Users,
  Image as ImageIcon,
  Settings,
  PlusCircle,
  PenSquare,
  MessageSquareReply,
  CreditCard,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

// Analytics is a stub page; only show it in the sidebar when the feature
// flag is explicitly enabled so we don't ship dead navigation.
const ANALYTICS_ENABLED = process.env.NEXT_PUBLIC_FEATURE_ANALYTICS === "true";

const navSections = [
  {
    label: "Main",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Compose", href: "/compose", icon: PenSquare },
      { name: "Calendar", href: "/calendar", icon: Calendar },
      ...(ANALYTICS_ENABLED
        ? [{ name: "Analytics", href: "/analytics", icon: BarChart3 }]
        : []),
    ]
  },
  {
    label: "Manage",
    items: [
      { name: "Accounts", href: "/accounts", icon: Users },
      { name: "Media Library", href: "/media", icon: ImageIcon },
      { name: "Auto Reply", href: "/auto-reply", icon: MessageSquareReply },
    ]
  },
  {
    label: "Account",
    items: [
      { name: "Billing", href: "/billing", icon: CreditCard },
      { name: "Settings", href: "/settings", icon: Settings },
    ]
  }
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-72 bg-[#0a0a1a] border-r border-white/[0.07] h-screen transition-all duration-300 overflow-hidden">
      {/* Logo Section */}
      <div className="p-8 flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.3)]">
          <PlusCircle className="text-white w-6 h-6" />
        </div>
        <span className="font-black text-2xl tracking-tighter bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
          SocialCopilot
        </span>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-4 space-y-8 overflow-y-auto scrollbar-hide">
        {navSections.map((section) => (
          <div key={section.label} className="space-y-2">
            <h3 className="px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">
              {section.label}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-300 group text-sm font-semibold",
                      isActive
                        ? "bg-indigo-500/10 text-indigo-400 shadow-[inset_0_0_20px_rgba(99,102,241,0.05)]"
                        : "text-zinc-500 hover:text-white hover:bg-white/[0.03]"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon
                        className={cn(
                          "w-5 h-5 transition-all duration-300",
                          isActive ? "text-indigo-400" : "text-zinc-600 group-hover:text-zinc-300"
                        )}
                      />
                      {item.name}
                    </div>
                    {isActive && (
                       <ChevronRight className="w-4 h-4 text-indigo-400/50" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer / Profile Section */}
      <div className="p-6 mt-auto border-t border-white/[0.05]">
        <div className="flex items-center gap-3 p-4 bg-white/[0.03] border border-white/[0.05] rounded-3xl group transition-all hover:bg-white/[0.05]">
          <div className="scale-110">
            <UserButton />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-white truncate">
              User Account
            </span>
            <span className="text-[10px] text-zinc-500 truncate uppercase tracking-widest">
              Manage Profile
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
