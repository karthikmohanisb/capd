"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";

type CodeResponse = {
  status: string;
  code?: string;
  secondsRemaining?: number;
  present: number;
  total: number;
};

const POLL_MS = 3000;
const FETCH_TIMEOUT_MS = 5000;

export function LivePanel({
  sessionId,
  initialStatus,
}: {
  sessionId: string;
  initialStatus: string;
}) {
  const [data, setData] = useState<CodeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const statusRef = useRef(initialStatus);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      try {
        const res = await fetch(`/api/admin/attendance/${sessionId}/code`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Request failed");
        const json: CodeResponse = await res.json();
        if (!cancelled) {
          setData(json);
          statusRef.current = json.status;
          setError(null);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError("Couldn't refresh — retrying…");
          setLoading(false);
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [sessionId]);

  return (
    <Card className="flex flex-col items-center gap-4 py-8">
      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : data?.status === "open" && data.code ? (
        <>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Current code</p>
          <p className="font-mono text-5xl font-semibold tracking-widest text-foreground">
            {data.code}
          </p>
          <p className="text-sm text-muted">Changes in {data.secondsRemaining}s</p>
        </>
      ) : (
        <p className="text-sm text-muted">
          {data?.status === "closed" ? "This session is closed." : "Open the session to generate a code."}
        </p>
      )}

      <div className="flex gap-6 text-center">
        <div>
          <p className="text-lg font-semibold text-foreground">{data?.present ?? "—"}</p>
          <p className="text-xs text-muted">Present</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-foreground">{data?.total ?? "—"}</p>
          <p className="text-xs text-muted">Total students</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-foreground">
            {data ? Math.max(data.total - data.present, 0) : "—"}
          </p>
          <p className="text-xs text-muted">Absent</p>
        </div>
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-warning">
          <RefreshCw className="h-3 w-3 animate-spin" />
          {error}
        </p>
      )}
    </Card>
  );
}
