"use client";

import { useTransition } from "react";
import Link from "next/link";
import { openSession, closeSession, deleteSession } from "@/lib/attendance/actions";
import { Button } from "@/components/ui/button";

export function SessionActions({
  sessionId,
  status,
}: {
  sessionId: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href={`/admin/attendance/${sessionId}`}>
        <Button type="button" variant="secondary" className="px-3 py-2 text-xs">
          View
        </Button>
      </Link>

      {status !== "open" && (
        <Button
          type="button"
          variant="primary"
          className="px-3 py-2 text-xs"
          loading={pending}
          onClick={() => startTransition(() => openSession(sessionId))}
        >
          Open
        </Button>
      )}

      {status === "open" && (
        <Button
          type="button"
          variant="secondary"
          className="px-3 py-2 text-xs"
          loading={pending}
          onClick={() => startTransition(() => closeSession(sessionId))}
        >
          Close
        </Button>
      )}

      <Button
        type="button"
        variant="danger"
        className="px-3 py-2 text-xs"
        loading={pending}
        onClick={() => {
          if (window.confirm("Delete this session and all its attendance records? This cannot be undone.")) {
            startTransition(() => deleteSession(sessionId));
          }
        }}
      >
        Delete
      </Button>
    </div>
  );
}
