import { requireStudent } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function EventsPage() {
  await requireStudent();
  const supabase = await createClient();

  const { data: events } = await supabase
    .from("published_events")
    .select("id, title, description, location, category, event_at, attendance_session_id")
    .order("event_at", { ascending: true, nullsFirst: false });

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <h1 className="text-lg font-semibold text-foreground">Events</h1>

      {events?.length ? (
        events.map((event) => (
          <Card key={event.id}>
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-foreground">{event.title}</p>
              {event.category && <Badge>{event.category}</Badge>}
            </div>
            {event.description && <p className="mt-1 text-sm text-muted">{event.description}</p>}
            <p className="mt-2 text-xs text-muted">
              {event.event_at && new Date(event.event_at).toLocaleString()}
              {event.location && ` · ${event.location}`}
            </p>
            {event.attendance_session_id && (
              <a href="/attendance" className="mt-2 inline-block text-xs font-medium text-primary hover:underline">
                Check in for attendance →
              </a>
            )}
          </Card>
        ))
      ) : (
        <p className="text-sm text-muted">No events right now.</p>
      )}
    </div>
  );
}
