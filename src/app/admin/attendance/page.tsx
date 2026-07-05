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

  const { data: sessions } = await supabase
    .from("attendance_sessions")
    .select("id, title, description, status, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Attendance</h1>
        <p className="mt-1 text-sm text-muted">Create a session, then open it to start the rotating code.</p>
      </div>

      <Card>
        <SessionForm />
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
