import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading placeholder that mirrors the final calendar layout so nothing
 * jumps into place once data arrives. Colors match the dashboard theme:
 * dark navy surfaces with indigo/emerald accents that mirror
 * CalendarView's statusColors map.
 */
export function CalendarSkeleton() {
  return (
    <div className="flex-1 h-full">
      <div className="max-w-[1600px] mx-auto p-6 lg:p-10">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Main calendar section */}
          <div className="flex-1 w-full space-y-6">
            {/* Title */}
            <div className="flex flex-col gap-2">
              <Skeleton className="h-8 w-64 bg-white/[0.06]" />
              <Skeleton className="h-4 w-96 bg-white/[0.04]" />
            </div>

            {/* Calendar card — same shell as the real calendar card */}
            <div className="h-[800px] w-full p-4 bg-[#0a0a1a] rounded-xl border border-white/[0.07] backdrop-blur-sm">
              {/* Toolbar */}
              <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-9 w-20 bg-white/[0.04] border border-white/[0.05]" />
                  <Skeleton className="h-9 w-20 bg-white/[0.04] border border-white/[0.05]" />
                  <Skeleton className="h-9 w-20 bg-white/[0.04] border border-white/[0.05]" />
                </div>
                <Skeleton className="h-6 w-40 bg-white/[0.06]" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-9 w-16 bg-white/[0.04] border border-white/[0.05]" />
                  <Skeleton className="h-9 w-16 bg-white/[0.04] border border-white/[0.05]" />
                  <Skeleton className="h-9 w-16 bg-indigo-500/40 border border-indigo-500/60" />
                </div>
              </div>

              {/* Weekday header */}
              <div className="grid grid-cols-7 gap-px border-b border-white/[0.07] pb-3 mb-3">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-16 mx-auto bg-white/[0.05]" />
                ))}
              </div>

              {/* 6-row month grid */}
              <div className="grid grid-cols-7 grid-rows-6 gap-px h-[640px]">
                {Array.from({ length: 42 }).map((_, i) => (
                  <div
                    key={i}
                    className="relative p-2 border border-white/[0.05] rounded-md bg-white/[0.02]"
                  >
                    <Skeleton className="h-3 w-6 bg-white/[0.06] mb-2" />
                    {/* Event placeholders — match CalendarView.statusColors */}
                    {i % 5 === 0 && (
                      <Skeleton className="h-5 w-full bg-indigo-500/20 border-l-4 border-indigo-500 rounded-sm mb-1" />
                    )}
                    {i % 7 === 0 && (
                      <Skeleton className="h-5 w-3/4 bg-emerald-500/20 border-l-4 border-emerald-500 rounded-sm" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right sidebar card — matches CalendarSidebar shell */}
          <div className="md:sticky md:top-24 w-full md:w-80 space-y-4">
            {/* Stats card */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#0a0a1a] p-6 space-y-5">
              <Skeleton className="h-5 w-32 bg-white/[0.06]" />
              <div className="grid grid-cols-2 gap-3">
                {[
                  "bg-emerald-500/15",
                  "bg-indigo-500/15",
                  "bg-rose-500/15",
                  "bg-zinc-500/15",
                ].map((tone, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-white/[0.05] bg-white/[0.03] p-4 space-y-2"
                  >
                    <Skeleton className="h-3 w-20 bg-white/[0.06]" />
                    <Skeleton className={`h-6 w-10 ${tone}`} />
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming posts card */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#0a0a1a] p-6 space-y-4">
              <Skeleton className="h-5 w-28 bg-white/[0.06]" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-xl bg-indigo-500/15 border border-indigo-500/20" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-full bg-white/[0.06]" />
                    <Skeleton className="h-3 w-2/3 bg-white/[0.04]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
