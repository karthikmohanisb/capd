"use client";

import { useTransition } from "react";
import { cancelScheduledNotification, sendNow } from "@/lib/notifications/actions";
import { Button } from "@/components/ui/button";

export function HistoryActions({ notificationId, status }: { notificationId: string; status: string }) {
  const [pending, startTransition] = useTransition();

  if (status !== "scheduled") return null;

  return (
    <div className="mt-2 flex gap-2">
      <Button
        type="button"
        className="px-3 py-1.5 text-xs"
        loading={pending}
        onClick={() => startTransition(() => sendNow(notificationId))}
      >
        Send now
      </Button>
      <Button
        type="button"
        variant="danger"
        className="px-3 py-1.5 text-xs"
        loading={pending}
        onClick={() => {
          if (window.confirm("Cancel this scheduled notification?")) {
            startTransition(() => cancelScheduledNotification(notificationId));
          }
        }}
      >
        Cancel
      </Button>
    </div>
  );
}
