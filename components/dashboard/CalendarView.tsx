"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Calendar, dateFnsLocalizer, Views, EventProps, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, addHours } from "date-fns";
import { enUS } from "date-fns/locale";
import withDragAndDrop, { EventInteractionArgs } from "react-big-calendar/lib/addons/dragAndDrop";

import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";

import { cn } from "@/lib/utils";
import { PostDetailSheet } from "./PostDetailSheet";

const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DnDCalendar = withDragAndDrop(Calendar) as React.ComponentType<any>;

export interface CalendarEventItem {
  id: string;
  title: string;
  start: Date;
  end: Date;
  status: string;
  content: string;
  mediaUrls: string[];
  raw: Record<string, unknown>;
}

interface CalendarViewProps {
  posts: Array<Record<string, unknown>>;
  onReschedule: (id: string, newDate: Date) => void;
  onRefresh: () => void;
}

const statusColors: Record<string, string> = {
  scheduled: "bg-indigo-500/20 border-indigo-500 text-indigo-200",
  published: "bg-emerald-500/20 border-emerald-500 text-emerald-200",
  posted: "bg-emerald-500/20 border-emerald-500 text-emerald-200",
  draft: "bg-zinc-500/20 border-zinc-500 text-zinc-200",
  failed: "bg-red-500/20 border-red-500 text-red-200",
  partial: "bg-amber-500/20 border-amber-500 text-amber-200",
};

const CustomEvent = ({ event }: EventProps<CalendarEventItem>) => {
  return (
    <div
      className={cn(
        "px-2 py-1 rounded-sm border-l-4 h-full text-xs font-medium overflow-hidden truncate",
        statusColors[event.status] || statusColors.draft,
      )}
    >
      {event.title}
    </div>
  );
};

export const CalendarView = ({ posts, onReschedule, onRefresh }: CalendarViewProps) => {
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [selectedPost, setSelectedPost] = useState<Record<string, unknown> | null>(null);

  const events = useMemo<CalendarEventItem[]>(() => {
    return posts.map((p) => {
      const content: string = typeof p.content === "string" ? p.content : "";
      const title =
        content.length === 0
          ? "(No content)"
          : content.length > 40
          ? `${content.substring(0, 40)}...`
          : content;

      const timeSource = (p.scheduledAt || p.createdAt) as string | Date;
      const startDate = new Date(timeSource);
      return {
        id: String(p.id),
        title,
        start: startDate,
        end: addHours(startDate, 1),
        status: String(p.status || "draft"),
        content,
        mediaUrls: (p.mediaUrls as string[]) || [],
        raw: p,
      };
    });
  }, [posts]);

  const onEventResize = useCallback(
    ({ event, start }: EventInteractionArgs<CalendarEventItem>) => {
      const targetStart = start as Date;
      if (targetStart.getTime() > Date.now() && (event.status === "scheduled" || event.status === "draft")) {
        onReschedule(event.id, targetStart);
      }
    },
    [onReschedule],
  );

  const onEventDrop = useCallback(
    ({ event, start }: EventInteractionArgs<CalendarEventItem>) => {
      const targetStart = start as Date;
      if (targetStart.getTime() > Date.now() && (event.status === "scheduled" || event.status === "draft")) {
        onReschedule(event.id, targetStart);
      }
    },
    [onReschedule],
  );

  return (
    <div className="h-[70vh] min-h-[500px] w-full p-4 bg-background/50 rounded-2xl border border-border backdrop-blur-sm">
      <DnDCalendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        view={view}
        onView={(v: View) => setView(v)}
        date={date}
        onNavigate={(d: Date) => setDate(d)}
        onEventDrop={onEventDrop as unknown as (args: EventInteractionArgs<object>) => void}
        onEventResize={onEventResize as unknown as (args: EventInteractionArgs<object>) => void}
        onSelectEvent={(e: CalendarEventItem) => setSelectedPost(e.raw)}
        resizable
        selectable
        components={{
          event: CustomEvent,
        }}
        className="dark-calendar"
        style={{ height: "100%" }}
      />

      <PostDetailSheet
        post={selectedPost}
        open={!!selectedPost}
        onOpenChange={(open) => !open && setSelectedPost(null)}
        onDeleted={onRefresh}
        onUpdated={onRefresh}
      />

      <style jsx global>{`
        .dark-calendar {
          color: #e2e8f0;
          font-family: inherit;
        }
        .rbc-off-range-bg {
          background: rgba(255, 255, 255, 0.02);
        }
        .rbc-header {
          padding: 12px;
          font-weight: 600;
          color: #94a3b8;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
        }
        .rbc-today {
          background: rgba(99, 102, 241, 0.05);
        }
        .rbc-month-view, .rbc-time-view {
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 1rem;
        }
        .rbc-day-bg + .rbc-day-bg {
          border-left: 1px solid rgba(255, 255, 255, 0.05);
        }
        .rbc-month-row + .rbc-month-row {
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }
        .rbc-toolbar button {
          color: #e2e8f0;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
          transition: all 0.2s;
        }
        .rbc-toolbar button:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .rbc-toolbar button.rbc-active {
          background: #6366f1;
          border-color: #6366f1;
          color: white;
        }
        .rbc-event {
          background: none;
          padding: 0;
          border: none;
        }
        .rbc-event:focus {
          outline: none;
        }
        .rbc-show-more {
          background: rgba(255, 255, 255, 0.05);
          color: #818cf8;
          font-size: 11px;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};
