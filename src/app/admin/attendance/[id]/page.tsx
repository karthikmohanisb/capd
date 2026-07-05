import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { LivePanel } from "./live-panel";
import { DetailActions } from "./detail-actions";

export default async function AdminAttendanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("attendance_sessions")
    .select("id, title, description, status, code_interval_seconds, created_at")
    .eq("id", id)
    .single();

  if (!session) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">{session.title}</h1>
        {session.description && <p className="mt-1 text-sm text-muted">{session.description}</p>}
      </div>

      <Card>
        <DetailActions sessionId={session.id} status={session.status} />
      </Card>

      <LivePanel sessionId={session.id} initialStatus={session.status} />

      <a
        href={`/admin/attendance/${session.id}/export`}
        className="text-center text-sm font-medium text-primary hover:underline"
      >
        Export attendance as CSV
      </a>
    </div>
  );
}
