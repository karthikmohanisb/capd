import { requireAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { AdminEventsClient } from "./events-client";

export default async function AdminEventsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: events }, { data: cohorts }] = await Promise.all([
    supabase
      .from("events")
      .select(
        "id, title, description, location, category, event_at, status, audience_type, cohort_id, attendance_session_id"
      )
      .order("event_at", { ascending: true })
      .limit(200),
    supabase.from("cohorts").select("id, name").order("name", { ascending: true }),
  ]);

  const sessionIds = (events ?? [])
    .map((e) => e.attendance_session_id)
    .filter((id): id is string => Boolean(id));
  const { data: sessions } = sessionIds.length
    ? await supabase.from("attendance_sessions").select("id, status, session_secret, code_interval_seconds").in("id", sessionIds)
    : { data: [] };
  const sessionDataById = Object.fromEntries((sessions ?? []).map((s) => [s.id, s]));

  // Fetch attendance records for all sessions
  const { data: attendanceRecords } = sessionIds.length
    ? await supabase
        .from("attendance_records")
        .select("session_id, student_id, profiles!student_id(full_name, email)")
        .in("session_id", sessionIds)
    : { data: [] };

  const recordsBySession: Record<string, any[]> = {};
  (attendanceRecords ?? []).forEach((record) => {
    const sessionId = record.session_id;
    if (!recordsBySession[sessionId]) recordsBySession[sessionId] = [];
    recordsBySession[sessionId].push(record);
  });

  const cohortNameById = Object.fromEntries((cohorts ?? []).map((c) => [c.id, c.name]));

  return (
    <AdminEventsClient
      initialEvents={events ?? []}
      cohorts={cohorts ?? []}
      sessionDataById={sessionDataById}
      cohortNameById={cohortNameById}
      attendanceBySession={recordsBySession}
    />
  );
}
