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

  if (sessionStatus === "draft") {
    return (
      <Button
        type="button"
        className="w-full"
        loading={pending}
        onClick={() => startTransition(() => openSession(sessionId))}
      >
        Open Attendance
      </Button>
    );
  }

  if (sessionStatus === "open") {
    return (
      <div className="space-y-3">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-xs text-gray-600 mb-2">Current Check-in Code</p>
          <p className="text-4xl font-bold text-blue-600 font-mono tracking-widest">{code}</p>
          <p className="text-xs text-gray-500 mt-2">Refreshes in {timeLeft} seconds</p>
        </div>
        <Button
          type="button"
          variant="danger"
          className="w-full"
          loading={pending}
          onClick={() => {
            if (window.confirm("Close attendance?")) {
              startTransition(() => closeSession(sessionId));
            }
          }}
        >
          Close
        </Button>
      </div>
    );
  }

  return <p className="text-xs text-gray-500">Attendance closed</p>;
}
