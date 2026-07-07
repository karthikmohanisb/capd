"use client";

import { useTransition } from "react";
import { publishEvent, cancelEvent, deleteEvent } from "@/lib/events/actions";
import { Button } from "@/components/ui/button";

export function EventActions({ eventId, status }: { eventId: string; status: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {status === "draft" && (
        <>
          <Button
            type="button"
            className="px-3 py-1.5 text-xs"
            loading={pending}
            onClick={() => startTransition(() => publishEvent(eventId, false))}
          >
            Publish
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="px-3 py-1.5 text-xs"
            loading={pending}
            onClick={() => startTransition(() => publishEvent(eventId, true))}
          >
            Publish &amp; notify
          </Button>
        </>
      )}
      {status !== "cancelled" && (
        <Button
          type="button"
          variant="danger"
          className="px-3 py-1.5 text-xs"
          loading={pending}
          onClick={() => {
            if (window.confirm("Cancel this event? Students will no longer see it.")) {
              startTransition(() => cancelEvent(eventId));
            }
          }}
        >
          Cancel
        </Button>
      )}
      <Button
        type="button"
        variant="secondary"
        className="px-3 py-1.5 text-xs"
        loading={pending}
        onClick={() => {
          if (window.confirm("Delete this event permanently?")) {
            startTransition(() => deleteEvent(eventId));
          }
        }}
      >
        Delete
      </Button>
    </div>
  );
}
