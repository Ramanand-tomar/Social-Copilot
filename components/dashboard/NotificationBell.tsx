"use client";

import { useState, useEffect } from "react";
import { Bell, AlertTriangle, Info, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NotificationItem {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok && isMounted) {
          const data = await res.json();
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      } catch {
        // silent
      }
    };
    load();
    const interval = setInterval(load, 60_000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "POST" });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch {
      // silent
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Open notifications"
        className="relative text-zinc-400 hover:text-white rounded-xl hover:bg-white/[0.05] h-10 w-10 min-h-11 min-w-11 lg:min-h-10 lg:min-w-10"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full ring-2 ring-[#0a0a1a] animate-pulse" />
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-[#0f0f23] border border-white/[0.1] rounded-2xl shadow-2xl p-4 z-50 overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-bold">
                  {unreadCount} new
                </span>
              )}
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              Close
            </button>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {notifications.length === 0 ? (
              <p className="text-xs text-zinc-500 py-6 text-center">No notifications yet</p>
            ) : (
              notifications.map((item) => {
                const isRead = !!item.readAt;
                const isError = item.kind.includes("failed") || item.kind.includes("error");
                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border text-xs transition-all ${
                      isRead
                        ? "bg-white/[0.01] border-white/[0.03] text-zinc-400"
                        : "bg-white/[0.04] border-indigo-500/20 text-white font-medium"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 font-semibold">
                        {isError ? (
                          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                        ) : (
                          <Info className="w-4 h-4 text-indigo-400 shrink-0" />
                        )}
                        <span>{item.title}</span>
                      </div>
                      {!isRead && (
                        <button
                          onClick={() => markAsRead(item.id)}
                          title="Mark as read"
                          aria-label="Mark notification as read"
                          className="text-zinc-500 hover:text-indigo-400 p-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {item.body && <p className="mt-1 text-[11px] text-zinc-400 leading-normal">{item.body}</p>}
                    <span className="mt-2 block text-[9px] text-zinc-500">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
