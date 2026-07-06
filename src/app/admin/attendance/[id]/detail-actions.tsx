"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { openSession, closeSession, deleteSession } from "@/lib/attendance/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function DetailActions({ sessionId, status }: { sessionId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <StatusBadge status={status} />
      <div className="flex flex-wrap gap-2">
        {status !== "open" && (
          <>
            <Button
              type="button"
              variant="secondary"
              loading={pending}
              className="px-3 py-2 text-xs"
              onClick={() => startTransition(async () => {
                await openSession(sessionId, false);
                router.refresh();
              })}
            >
              Open session
            </Button>
            <Button
              type="button"
              loading={pending}
              className="px-3 py-2 text-xs"
              onClick={() => startTransition(async () => {
                await openSession(sessionId, true);
                router.refresh();
              })}
            >
              Open &amp; notify everyone
            </Button>
          </>
        )}
        {status === "open" && (
          <Button
            type="button"
            variant="secondary"
            loading={pending}
            className="px-3 py-2 text-xs"
            onClick={() => startTransition(async () => {
              await closeSession(sessionId);
              router.refresh();
            })}
          >
            Close session
          </Button>
        )}
        <Button
          type="button"
          variant="danger"
          loading={pending}
          className="px-3 py-2 text-xs"
          onClick={() => {
            if (window.confirm("Delete this session and all its attendance records? This cannot be undone.")) {
              startTransition(() => deleteSession(sessionId));
            }
          }}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "open") return <Badge tone="success">Open</Badge>;
  if (status === "closed") return <Badge tone="neutral">Closed</Badge>;
  return <Badge tone="warning">Draft</Badge>;
}
