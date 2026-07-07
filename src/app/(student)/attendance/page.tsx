import { requireStudent } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { CodeForm } from "@/components/code-form";

export default async function AttendancePage() {
  const student = await requireStudent();
  const supabase = await createClient();

  const { data: openSessions } = await supabase
    .from("open_attendance_sessions")
    .select("id, title, description, opened_at")
    .order("opened_at", { ascending: false });

  const sessionIds = (openSessions ?? []).map((s) => s.id);
  const { data: myRecords } = sessionIds.length
    ? await supabase
        .from("attendance_records")
        .select("session_id")
        .eq("student_id", student.id)
        .in("session_id", sessionIds)
    : { data: [] };

  const markedSessionIds = new Set((myRecords ?? []).map((r) => r.session_id));

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <h1 className="text-lg font-semibold text-foreground">Attendance</h1>

      {openSessions?.length ? (
        openSessions.map((session) => (
          <Card key={session.id}>
            <p className="font-medium text-foreground">{session.title}</p>
            {session.description && (
              <p className="mt-0.5 text-sm text-muted">{session.description}</p>
            )}
            {markedSessionIds.has(session.id) ? (
              <p className="mt-3 text-sm font-medium text-success">You&apos;re marked present ✓</p>
            ) : (
              <CodeForm sessionId={session.id} />
            )}
          </Card>
        ))
      ) : (
        <p className="text-sm text-muted">No attendance session is open right now.</p>
      )}
    </div>
  );
}
