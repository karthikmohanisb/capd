"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { sendNotificationCore } from "./send";

export type ActionState = { error?: string; success?: string } | undefined;

const TITLE_MAX = 120;
const MESSAGE_MAX = 500;

export async function createNotification(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const deepLink = String(formData.get("deep_link") ?? "").trim();
  const audience = formData.get("audience") === "selected" ? "selected" : "all";
  const sendMode = String(formData.get("send_mode") ?? "now");
  const scheduledAtRaw = String(formData.get("scheduled_at") ?? "");
  const selectedStudentIds = formData.getAll("student_ids").map(String).filter(Boolean);

  if (!title || title.length > TITLE_MAX) {
    return { error: "Enter a title (up to 120 characters)." };
  }
  if (!message || message.length > MESSAGE_MAX) {
    return { error: "Enter a message (up to 500 characters)." };
  }
  if (audience === "selected" && selectedStudentIds.length === 0) {
    return { error: 'Select at least one student, or choose "Everyone".' };
  }

  let scheduledAt: string | null = null;
  if (sendMode === "schedule") {
    if (!scheduledAtRaw) {
      return { error: "Choose a date and time to schedule for." };
    }
    const parsed = new Date(scheduledAtRaw);
    if (Number.isNaN(parsed.getTime()) || parsed.getTime() < Date.now() - 60_000) {
      return { error: "Choose a valid time in the future." };
    }
    scheduledAt = parsed.toISOString();
  }

  const supabase = await createClient();

  const { data: notification, error: insertError } = await supabase
    .from("notifications")
    .insert({
      title,
      message,
      deep_link: deepLink || null,
      created_by: admin.id,
      audience,
      status: scheduledAt ? "scheduled" : "draft",
      scheduled_at: scheduledAt,
    })
    .select("id")
    .single();

  if (insertError || !notification) {
    return { error: "Could not create the notification. Please try again." };
  }

  if (audience === "selected") {
    const rows = selectedStudentIds.map((studentId) => ({
      notification_id: notification.id,
      student_id: studentId,
    }));
    const { error: targetsError } = await supabase.from("notification_targets").insert(rows);
    if (targetsError) {
      return { error: "Could not save the selected students. Please try again." };
    }
  }

  if (scheduledAt) {
    revalidatePath("/admin/notifications");
    return { success: "Notification scheduled." };
  }

  const result = await sendNotificationCore(supabase, notification.id);
  revalidatePath("/admin/notifications");

  if (!result.ok) {
    return { error: result.errorMessage ?? "Notification saved, but sending failed." };
  }

  return { success: `Sent to ${result.recipients} device(s).` };
}

export async function cancelScheduledNotification(notificationId: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ status: "cancelled" })
    .eq("id", notificationId)
    .eq("status", "scheduled");
  revalidatePath("/admin/notifications");
}

export async function sendNow(notificationId: string) {
  await requireAdmin();
  const supabase = await createClient();
  await sendNotificationCore(supabase, notificationId);
  revalidatePath("/admin/notifications");
}
