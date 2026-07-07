import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStudent } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CodeForm } from "@/components/code-form";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const student = await requireStudent();
  const { id } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("published_events")
    .select("id, title, description, location, category, event_at, attendance_session_id")
    .eq("id", id)
    .single();

  if (!event) {
    notFound();
  }

  let attendance: { status: "open"; marked: boolean } | { status: "unavailable" } = {
    status: "unavailable",
  };

  if (event.attendance_session_id) {
    const { data: session } = await supabase
      .from("open_attendance_sessions")
      .select("id")
      .eq("id", event.attendance_session_id)
      .maybeSingle();

    if (session) {
      const { data: record } = await supabase
        .from("attendance_records")
        .select("id")
        .eq("session_id", event.attendance_session_id)
        .eq("student_id", student.id)
        .maybeSingle();

      attendance = { status: "open", marked: Boolean(record) };
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <Link href="/events" className="text-sm text-muted hover:underline">
        ← Back to Events
      </Link>

      <div className="flex items-start justify-between gap-2">
        <h1 className="text-lg font-semibold text-foreground">{event.title}</h1>
        {event.category && <Badge>{event.category}</Badge>}
      </div>

      <p className="text-sm text-muted">
        {event.event_at && new Date(event.event_at).toLocaleString()}
        {event.location && ` · ${event.location}`}
      </p>

      {event.description && (
        <Card>
          <p className="whitespace-pre-wrap text-sm text-foreground">{event.description}</p>
        </Card>
      )}

      {event.attendance_session_id && (
        <Card>
          <p className="font-medium text-foreground">Attendance</p>
          {attendance.status === "open" ? (
            attendance.marked ? (
              <p className="mt-2 text-sm font-medium text-success">You&apos;re marked present ✓</p>
            ) : (
              <>
                <p className="mt-1 text-sm text-muted">Enter the code shown at the event to check in.</p>
                <CodeForm sessionId={event.attendance_session_id} />
              </>
            )
          ) : (
            <p className="mt-1 text-sm text-muted">
              Attendance isn&apos;t open for this event right now — check back later.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
