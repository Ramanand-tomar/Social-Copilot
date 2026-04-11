"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard] route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-400">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
        <p className="max-w-md text-sm text-zinc-400">
          We hit an unexpected error rendering this page. It&apos;s been logged —
          you can retry, or jump back to the dashboard.
        </p>
        {error.digest && (
          <p className="pt-2 font-mono text-[11px] text-zinc-600">
            ref: {error.digest}
          </p>
        )}
      </div>
      <div className="flex gap-3">
        <Button onClick={reset} variant="default">
          Try again
        </Button>
        <Link
          href="/dashboard"
          className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium text-foreground hover:bg-muted"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
