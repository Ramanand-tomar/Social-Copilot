"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Calendar, dateFnsLocalizer, Views, EventProps } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, addHours, startOfDay } from "date-fns";
import { enUS } from "date-fns/locale";
import withDragAndDrop, { EventInteractionArgs } from "react-big-calendar/lib/addons/dragAndDrop";

import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PostDetailSheet } from "./PostDetailSheet";

// Localizer setup for react-big-calendar
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

const DnDCalendar = withDragAndDrop(Calendar);

interface CalendarPost {
  id: string;
  title: string;
  start: Date;
  end: Date;
  status: string;
  content: string;
  mediaUrls: string[];
}

interface CalendarViewProps {
  posts: any[];
  onReschedule: (id: string, newDate: Date) => void;
  onRefresh: () => void;
}

const statusColors: Record<string, string> = {
  scheduled: "bg-indigo-500/20 border-indigo-500 text-indigo-200",
  posted: "bg-emerald-500/20 border-emerald-500 text-emerald-200",
  draft: "bg-zinc-500/20 border-zinc-500 text-zinc-200",
  failed: "bg-red-500/20 border-red-500 text-red-200",
  partial: "bg-amber-500/20 border-amber-500 text-amber-200",
};

const CustomEvent = ({ event }: EventProps<any>) => {
  return (
    <div className={cn(
      "px-2 py-1 rounded-sm border-l-4 h-full text-xs font-medium overflow-hidden truncate",
      statusColors[event.status] || statusColors.draft
    )}>
      {event.title}
    </div>
  );
};

export const CalendarView = ({ posts, onReschedule, onRefresh }: CalendarViewProps) => {
  const [view, setView] = useState<any>(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [selectedPost, setSelectedPost] = useState<any>(null);

  const events = useMemo(() => {
    return posts.map(p => {
      const content: string = typeof p.content === "string" ? p.content : "";
      const title = content.length === 0
        ? "(No content)"
        : content.length > 40
          ? `${content.substring(0, 40)}...`
          : content;
      return {
        id: p.id,
        title,
        start: new Date(p.scheduledAt || p.createdAt),
        end: addHours(new Date(p.scheduledAt || p.createdAt), 1),
        status: p.status,
        content,
        mediaUrls: p.mediaUrls,
        raw: p,
      };
    });
  }, [posts]);

  const onEventResize = useCallback(
    ({ event, start, end }: EventInteractionArgs<any>) => {
      // In this app, we mostly care about start time (scheduledAt)
      onReschedule(event.id, start as Date);
    },
    [onReschedule]
  );

  const onEventDrop = useCallback(
    ({ event, start }: EventInteractionArgs<any>) => {
      onReschedule(event.id, start as Date);
    },
    [onReschedule]
  );

  return (
    <div className="h-[800px] w-full p-4 bg-background/50 rounded-xl border border-border backdrop-blur-sm">
      <DnDCalendar
        localizer={localizer}
        events={events}
        startAccessor={(event: any) => event.start}
        endAccessor={(event: any) => event.end}
        view={view}
        onView={(v: any) => setView(v)}
        date={date}
        onNavigate={(d: any) => setDate(d)}
        onEventDrop={onEventDrop}
        onEventResize={onEventResize}
        onSelectEvent={(e: any) => setSelectedPost(e.raw)}
        resizable
        selectable
        components={{
          event: CustomEvent,
        } as any}
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
          border-radius: 8px;
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
