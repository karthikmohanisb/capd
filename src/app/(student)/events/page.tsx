import Link from "next/link";
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

  const groupedByDate = (events || []).reduce(
    (acc, event) => {
      if (!event.event_at) return acc;
      const date = new Date(event.event_at).toLocaleDateString();
      if (!acc[date]) acc[date] = [];
      acc[date].push(event);
      return acc;
    },
    {} as Record<string, typeof events>,
  );

  const sortedDates = Object.keys(groupedByDate).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime(),
  );

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <h1 className="text-xl font-bold text-foreground">📅 Events Calendar</h1>

      {sortedDates.length ? (
        sortedDates.map((dateStr) => {
          const date = new Date(dateStr);
          const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
          const dateFormatted = date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });

          return (
            <div key={dateStr} className="flex flex-col gap-3">
              <div className="flex items-center gap-2 border-b pb-2">
                <span className="text-sm font-semibold text-primary">{dayName}</span>
                <span className="text-xs text-muted">{dateFormatted}</span>
              </div>

              <div className="flex flex-col gap-3">
                {groupedByDate[dateStr]?.map((event) => (
                  <Link key={event.id} href={`/events/${event.id}`}>
                    <Card className="hover:bg-accent transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{event.title}</p>
                          {event.event_at && (
                            <p className="mt-1 text-xs text-muted">
                              {new Date(event.event_at).toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                              {event.location && ` · ${event.location}`}
                            </p>
                          )}
                          {event.description && (
                            <p className="mt-2 line-clamp-2 text-sm text-muted">{event.description}</p>
                          )}
                        </div>
                        {event.category && <Badge>{event.category}</Badge>}
                      </div>
                      {event.attendance_session_id && (
                        <p className="mt-3 text-xs font-medium text-primary">✓ Attendance enabled</p>
                      )}
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          );
        })
      ) : (
        <p className="text-sm text-muted text-center py-8">No upcoming events</p>
      )}
    </div>
  );
}
