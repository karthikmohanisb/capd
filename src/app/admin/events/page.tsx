import { requireAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EventForm } from "./event-form";
import { EventActions } from "./event-actions";
import type { EventStatus } from "@/types/database";

export default async function AdminEventsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: events }, { data: cohorts }, { data: students }] = await Promise.all([
    supabase
      .from("events")
      .select(
        "id, title, description, location, category, event_at, status, audience_type, cohort_id, attendance_session_id"
      )
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("cohorts").select("id, name").order("name", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("role", "student")
      .eq("status", "active")
      .order("email", { ascending: true }),
  ]);

  const cohortNameById = new Map((cohorts ?? []).map((c) => [c.id, c.name]));

  const sessionIds = (events ?? [])
    .map((e) => e.attendance_session_id)
    .filter((id): id is string => Boolean(id));
  const { data: sessions } = sessionIds.length
    ? await supabase.from("attendance_sessions").select("id, status").in("id", sessionIds)
    : { data: [] };
  const sessionStatusById = new Map((sessions ?? []).map((s) => [s.id, s.status]));

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Events</h1>
        <p className="mt-1 text-sm text-muted">
          Create an event, then publish it so students see it in their Events feed.
        </p>
      </div>

      <Card>
        <EventForm cohorts={cohorts ?? []} students={students ?? []} />
      </Card>

      <div className="flex flex-col gap-3">
        {events?.length ? (
          events.map((event) => (
            <Card key={event.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-foreground">{event.title}</p>
                  {event.description && <p className="mt-0.5 text-sm text-muted">{event.description}</p>}
                </div>
                <StatusBadge status={event.status} />
              </div>
              <p className="mt-2 text-xs text-muted">
                {event.event_at && new Date(event.event_at).toLocaleString()}
                {event.location && ` · ${event.location}`}
                {event.category && ` · ${event.category}`}
              </p>
              <p className="mt-1 text-xs text-muted">
                {event.audience_type === "all" && "Everyone"}
                {event.audience_type === "cohort" &&
                  `Cohort: ${cohortNameById.get(event.cohort_id ?? "") ?? "Unknown"}`}
                {event.audience_type === "custom" && "Custom list"}
              </p>
              <EventActions eventId={event.id} status={event.status} />

              {event.attendance_session_id && (
                <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-foreground">Attendance Session</p>
                    <AttendanceStatusBadge
                      status={sessionStatusById.get(event.attendance_session_id) ?? "draft"}
                    />
                  </div>
                  <p className="text-xs text-muted">
                    ID: {event.attendance_session_id.substring(0, 8)}...
                  </p>
                </div>
              )}
            </Card>
          ))
        ) : (
          <p className="text-sm text-muted">No events yet. Create one above.</p>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: EventStatus }) {
  if (status === "published") return <Badge tone="success">Published</Badge>;
  if (status === "cancelled") return <Badge tone="neutral">Cancelled</Badge>;
  return <Badge tone="warning">Draft</Badge>;
}

function AttendanceStatusBadge({ status }: { status: string }) {
  if (status === "open") return <Badge tone="success">Open</Badge>;
  if (status === "closed") return <Badge tone="neutral">Closed</Badge>;
  return <Badge tone="warning">Draft</Badge>;
}
