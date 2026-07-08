"use client";

import { useState, useEffect, useTransition } from "react";
import { openSession, closeSession } from "@/lib/attendance/actions";
import { currentWindowIndex, computeAttendanceCode, secondsUntilNextWindow } from "@/lib/attendance/code";
import { Button } from "@/components/ui/button";

interface AttendanceActionsProps {
  sessionId: string;
  sessionStatus: "draft" | "open" | "closed";
  sessionSecret: string;
  codeInterval: number;
}

export function AttendanceActions({
  sessionId,
  sessionStatus,
  sessionSecret,
  codeInterval,
}: AttendanceActionsProps) {
  const [pending, startTransition] = useTransition();
  const [code, setCode] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (sessionStatus !== "open" || !sessionSecret) return;

    const updateCode = () => {
      const windowIndex = currentWindowIndex(codeInterval);
      const newCode = computeAttendanceCode(sessionSecret, sessionId, windowIndex);
      setCode(newCode);
      setTimeLeft(secondsUntilNextWindow(codeInterval));
    };

    updateCode();
    const interval = setInterval(updateCode, 1000);
    return () => clearInterval(interval);
  }, [sessionStatus, sessionSecret, sessionId, codeInterval]);

  return (
    <div className="flex flex-col gap-2">
      {sessionStatus === "draft" && (
        <Button
          type="button"
          className="px-3 py-1.5 text-xs"
          loading={pending}
          onClick={() => startTransition(() => openSession(sessionId))}
        >
          Open Attendance
        </Button>
      )}

      {sessionStatus === "open" && (
        <>
          <div className="flex items-center gap-3 rounded-lg bg-primary/10 p-3">
            <div>
              <p className="text-xs text-muted mb-1">Current code (refreshes in {timeLeft}s)</p>
              <p className="text-3xl font-bold text-primary font-mono tracking-wider">{code}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="danger"
            className="px-3 py-1.5 text-xs"
            loading={pending}
            onClick={() => {
              if (window.confirm("Close attendance? Students won't be able to check in anymore.")) {
                startTransition(() => closeSession(sessionId));
              }
            }}
          >
            Close Attendance
          </Button>
        </>
      )}

      {sessionStatus === "closed" && (
        <div className="text-xs text-muted bg-surface rounded px-2 py-1">
          Attendance is closed.
        </div>
      )}
    </div>
  );
}
