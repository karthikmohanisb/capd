import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SessionForm } from "./session-form";
import { SessionActions } from "./session-actions";

export default async function AdminAttendancePage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: sessions }, { data: cohorts }, { data: students }] = await Promise.all([
    supabase
      .from("attendance_sessions")
      .select("id, title, description, status, audience_type, cohort_id, created_at")
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

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Attendance</h1>
        <p className="mt-1 text-sm text-muted">Create a session, then open it to start the rotating code.</p>
      </div>

      <Card>
        <SessionForm cohorts={cohorts ?? []} students={students ?? []} />
      </Card>

      <div className="flex flex-col gap-3">
        {sessions?.length ? (
          sessions.map((session) => (
            <Card key={session.id} className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link
                    href={`/admin/attendance/${session.id}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {session.title}
                  </Link>
                  {session.description && (
                    <p className="mt-0.5 text-sm text-muted">{session.description}</p>
                  )}
                  <p className="mt-0.5 text-xs text-muted">
                    {session.audience_type === "all" && "Everyone"}
                    {session.audience_type === "cohort" &&
                      `Cohort: ${cohortNameById.get(session.cohort_id ?? "") ?? "Unknown"}`}
                    {session.audience_type === "custom" && "Custom list"}
                  </p>
                </div>
                <StatusBadge status={session.status} />
              </div>
              <SessionActions sessionId={session.id} status={session.status} />
            </Card>
          ))
        ) : (
          <p className="text-sm text-muted">No sessions yet. Create one above.</p>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "open") return <Badge tone="success">Open</Badge>;
  if (status === "closed") return <Badge tone="neutral">Closed</Badge>;
  return <Badge tone="warning">Draft</Badge>;
}
