import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { sendPushNotification } from "@/lib/onesignal/client";

// Internal helper — deliberately NOT a Server Action (its first argument, a
// Supabase client, isn't serializable across the client/server boundary).
// Shared by the immediate-send path (admin's own RLS-scoped session) and the
// cron path (service-role client, since scheduled sends run with no
// logged-in session at all). Both satisfy the "is_admin() or service role"
// read access this needs on push_subscriptions.
export async function sendNotificationCore(
  supabase: SupabaseClient<Database>,
  notificationId: string
) {
  const { data: notification } = await supabase
    .from("notifications")
    .select("id, title, message, deep_link, audience, cohort_id, status")
    .eq("id", notificationId)
    .single();

  if (!notification) {
    return { ok: false, recipients: 0, errorMessage: "Notification not found." };
  }

  if (notification.status === "sent" || notification.status === "cancelled") {
    return { ok: false, recipients: 0, errorMessage: "Notification already sent or cancelled." };
  }

  await supabase.from("notifications").update({ status: "sending" }).eq("id", notificationId);

  let studentIds: string[] | null = null;
  if (notification.audience === "selected") {
    const { data: targets } = await supabase
      .from("notification_targets")
      .select("student_id")
      .eq("notification_id", notificationId);
    studentIds = (targets ?? []).map((t) => t.student_id);
  } else if (notification.audience === "cohort" && notification.cohort_id) {
    const { data: cohortStudents } = await supabase
      .from("profiles")
      .select("id")
      .eq("cohort_id", notification.cohort_id);
    studentIds = (cohortStudents ?? []).map((s) => s.id);
  }

  let subsQuery = supabase
    .from("push_subscriptions")
    .select("onesignal_subscription_id, student_id")
    .eq("is_active", true);

  if (studentIds) {
    subsQuery = subsQuery.in("student_id", studentIds);
  }

  const { data: subscriptions } = await subsQuery;
  const subscriptionIds = (subscriptions ?? []).map((s) => s.onesignal_subscription_id);

  if (subscriptionIds.length === 0) {
    await supabase
      .from("notifications")
      .update({
        status: "failed",
        error_message: "No active devices to notify.",
        sent_at: new Date().toISOString(),
      })
      .eq("id", notificationId);
    return { ok: false, recipients: 0, errorMessage: "No active devices to notify." };
  }

  const result = await sendPushNotification({
    subscriptionIds,
    title: notification.title,
    message: notification.message,
    url: notification.deep_link ?? undefined,
  });

  if (result.invalidSubscriptionIds.length > 0) {
    await supabase
      .from("push_subscriptions")
      .update({ is_active: false })
      .in("onesignal_subscription_id", result.invalidSubscriptionIds);
  }

  await supabase
    .from("notifications")
    .update({
      status: result.ok ? "sent" : "failed",
      sent_at: new Date().toISOString(),
      onesignal_notification_id: result.oneSignalId ?? null,
      error_message: result.ok ? null : result.errorMessage ?? "Unknown error.",
      stats: { recipients: subscriptionIds.length, sent: result.recipients },
    })
    .eq("id", notificationId);

  return result;
}
