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

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const groupedEvents: Record<string, typeof events> = {};
  (events || []).forEach((event) => {
    if (!event.event_at) return;
    const date = new Date(event.event_at).toLocaleDateString();
    if (!groupedEvents[date]) groupedEvents[date] = [];
    groupedEvents[date].push(event);
  });

  const sortedDates = Object.keys(groupedEvents).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">📅 Events Calendar</h1>
        <p className="text-sm text-muted mt-1">Tap an event to check in</p>
      </div>

      {sortedDates.length ? (
        <div className="flex flex-col gap-4">
          {sortedDates.map((dateStr) => {
            const date = new Date(dateStr);
            const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
            const dateFormatted = date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
            const isToday = dateStr === today.toLocaleDateString();

            return (
              <div key={dateStr}>
                <div
                  className={`flex items-center gap-2 mb-2 pb-2 border-b ${
                    isToday ? "border-primary" : "border-border"
                  }`}
                >
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded ${
                      isToday ? "bg-primary text-primary-foreground" : "bg-surface"
                    }`}
                  >
                    {dayName}
                  </span>
                  <span className="text-xs text-muted">{dateFormatted}</span>
                  {isToday && <span className="text-xs font-bold text-primary">Today</span>}
                </div>

                <div className="flex flex-col gap-2">
                  {groupedEvents[dateStr]?.map((event) => (
                    <Link key={event.id} href={`/events/${event.id}`}>
                      <Card className="active:bg-primary/10">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground text-sm">{event.title}</p>
                            {event.event_at && (
                              <p className="text-xs text-muted mt-1">
                                {new Date(event.event_at).toLocaleTimeString("en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            )}
                            {event.location && (
                              <p className="text-xs text-muted">📍 {event.location}</p>
                            )}
                          </div>
                          {event.attendance_session_id && (
                            <span className="text-xs font-bold text-primary shrink-0">✓</span>
                          )}
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted text-center py-8">No upcoming events</p>
      )}
    </div>
  );
}
