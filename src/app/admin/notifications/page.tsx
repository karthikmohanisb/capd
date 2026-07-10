import { requireAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ComposeForm } from "./compose-form";
import { HistoryActions } from "./history-actions";
import type { NotificationStats, NotificationStatus } from "@/types/database";

export default async function AdminNotificationsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [students, { data: cohorts }, { count: deviceCount }, { data: notifications }] =
    await Promise.all([
      fetchAllRows((from, to) =>
        supabase
          .from("profiles")
          .select("id, email, full_name")
          .eq("role", "student")
          .eq("status", "active")
          .order("email", { ascending: true })
          .range(from, to)
      ),
      supabase.from("cohorts").select("id, name").order("name", { ascending: true }),
      supabase
        .from("push_subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
      supabase
        .from("notifications")
        .select("id, title, message, audience, cohort_id, status, scheduled_at, sent_at, stats, error_message")
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

  const cohortNameById = new Map((cohorts ?? []).map((c) => [c.id, c.name]));

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Notifications</h1>
        <p className="mt-1 text-sm text-muted">{deviceCount ?? 0} device(s) registered for push.</p>
      </div>

      <Card>
        <ComposeForm cohorts={cohorts ?? []} students={students} />
      </Card>

      <div className="flex flex-col gap-3">
        {notifications?.length ? (
          notifications.map((n) => (
            <Card key={n.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-foreground">{n.title}</p>
                  <p className="mt-0.5 text-sm text-muted">{n.message}</p>
                </div>
                <StatusBadge status={n.status} />
              </div>
              <p className="mt-2 text-xs text-muted">
                {n.audience === "all" && "Everyone"}
                {n.audience === "cohort" && `Cohort: ${cohortNameById.get(n.cohort_id ?? "") ?? "Unknown"}`}
                {n.audience === "selected" && "Selected students"}
                {n.scheduled_at && ` · Scheduled for ${new Date(n.scheduled_at).toLocaleString()}`}
                {n.sent_at && ` · Sent ${new Date(n.sent_at).toLocaleString()}`}
              </p>
              {n.stats && (n.stats as NotificationStats).recipients !== undefined && (
                <p className="mt-1 text-xs text-muted">
                  {(n.stats as NotificationStats).sent ?? 0} / {(n.stats as NotificationStats).recipients} delivered
                </p>
              )}
              {n.error_message && <p className="mt-1 text-xs text-danger">{n.error_message}</p>}
              <HistoryActions notificationId={n.id} status={n.status} />
            </Card>
          ))
        ) : (
          <p className="text-sm text-muted">No notifications yet.</p>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: NotificationStatus }) {
  if (status === "sent") return <Badge tone="success">Sent</Badge>;
  if (status === "scheduled") return <Badge tone="warning">Scheduled</Badge>;
  if (status === "sending") return <Badge tone="warning">Sending</Badge>;
  if (status === "failed") return <Badge tone="danger">Failed</Badge>;
  if (status === "cancelled") return <Badge tone="neutral">Cancelled</Badge>;
  return <Badge tone="neutral">Draft</Badge>;
}
