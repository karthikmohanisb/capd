import { requireStudent } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Card } from "@/components/ui/card";

export default async function EventsPage() {
  await requireStudent();
  const supabase = await createClient();

  const { data: events } = await supabase
    .from("published_events")
    .select("id, title, description, location, category, event_at, attendance_session_id")
    .order("event_at", { ascending: true, nullsFirst: false });

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <h1 className="text-lg font-semibold text-foreground">📅 Events</h1>

      {events?.length ? (
        <div className="flex flex-col gap-3">
          {events.map((event) => (
            <Link key={event.id} href={`/events/${event.id}`}>
              <Card>
                <p className="font-medium text-foreground">{event.title}</p>
                {event.event_at && (
                  <p className="mt-1 text-xs text-muted">
                    {new Date(event.event_at).toLocaleString()}
                  </p>
                )}
                {event.location && <p className="text-xs text-muted">📍 {event.location}</p>}
                {event.attendance_session_id && (
                  <p className="mt-2 text-xs font-bold text-primary">✓ Attendance available</p>
                )}
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">No upcoming events</p>
      )}
    </div>
  );
}
