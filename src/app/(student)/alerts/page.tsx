import { requireStudent } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { NotificationsCard } from "./notifications-card";

export default async function AlertsPage() {
  await requireStudent();
  const supabase = await createClient();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, title, message, deep_link, sent_at")
    .eq("status", "sent")
    .order("sent_at", { ascending: false })
    .limit(50);

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <h1 className="text-lg font-semibold text-foreground">Alerts</h1>

      <NotificationsCard />

      <div className="flex flex-col gap-3">
        {notifications?.length ? (
          notifications.map((n) => (
            <Card key={n.id}>
              <p className="font-medium text-foreground">{n.title}</p>
              <p className="mt-1 text-sm text-muted">{n.message}</p>
              {n.deep_link && (
                <a href={n.deep_link} className="mt-2 inline-block text-xs text-primary hover:underline">
                  Open
                </a>
              )}
              {n.sent_at && (
                <p className="mt-2 text-xs text-muted">
                  {new Date(n.sent_at).toLocaleString()}
                </p>
              )}
            </Card>
          ))
        ) : (
          <p className="text-sm text-muted">No announcements yet.</p>
        )}
      </div>
    </div>
  );
}
