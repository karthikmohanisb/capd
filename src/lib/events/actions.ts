"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { sendNotificationCore } from "@/lib/notifications/send";

export type ActionState = { error?: string; success?: string } | undefined;

const TITLE_MAX = 120;

export async function createEvent(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const eventAtRaw = String(formData.get("event_at") ?? "");

  const audienceType = formData.get("audience_type");
  const audience: "all" | "cohort" | "custom" =
    audienceType === "cohort" ? "cohort" : audienceType === "custom" ? "custom" : "all";
  const cohortId = audience === "cohort" ? String(formData.get("cohort_id") ?? "") || null : null;
  const studentIds = audience === "custom" ? formData.getAll("student_ids").map(String).filter(Boolean) : [];

  if (!title || title.length > TITLE_MAX) {
    return { error: "Enter a title (up to 120 characters)." };
  }
  if (audience === "cohort" && !cohortId) {
    return { error: "Choose a cohort." };
  }
  if (audience === "custom" && studentIds.length === 0) {
    return { error: "Select at least one student for the custom list." };
  }

  const eventAt = eventAtRaw ? new Date(eventAtRaw).toISOString() : null;

  const supabase = await createClient();

  // Automatically create an attendance session for every event
  // (no checkbox needed — attendance is always available for events with dates)
  let attendanceSessionId: string | null = null;
  if (eventAt) {
    const { data: session, error: sessionError } = await supabase
      .from("attendance_sessions")
      .insert({
        title,
        description: description || null,
        created_by: admin.id,
        code_interval_seconds: 45,
        audience_type: audience,
        cohort_id: cohortId,
      })
      .select("id")
      .single();

    if (sessionError || !session) {
      return { error: "Could not set up attendance for this event. Please try again." };
    }

    if (audience === "custom") {
      const rows = studentIds.map((studentId) => ({ session_id: session.id, student_id: studentId }));
      const { error: participantsError } = await supabase
        .from("attendance_session_participants")
        .insert(rows);
      if (participantsError) {
        return { error: "Attendance was set up, but saving the custom list failed. Please try again." };
      }
    }

    attendanceSessionId = session.id;
  }

  const { data: event, error } = await supabase
    .from("events")
    .insert({
      title,
      description: description || null,
      location: location || null,
      category: category || null,
      event_at: eventAt,
      audience_type: audience,
      cohort_id: cohortId,
      attendance_session_id: attendanceSessionId,
      created_by: admin.id,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !event) {
    return { error: "Could not create the event. Please try again." };
  }

  if (audience === "custom") {
    const rows = studentIds.map((studentId) => ({ event_id: event.id, student_id: studentId }));
    const { error: participantsError } = await supabase.from("event_participants").insert(rows);
    if (participantsError) {
      return { error: "Event created, but saving the custom list failed. Please try again." };
    }
  }

  revalidatePath("/admin/events");
  return {
    success: attendanceSessionId
      ? "Event created as a draft, with attendance ready to open."
      : "Event created as a draft.",
  };
}

export async function publishEvent(eventId: string, notifyStudents: boolean) {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .update({ status: "published" })
    .eq("id", eventId)
    .select("title, description, audience_type, cohort_id")
    .single();

  if (!event) {
    revalidatePath("/admin/events");
    return;
  }

  if (notifyStudents) {
    const notificationAudience = event.audience_type === "custom" ? "selected" : event.audience_type;

    const { data: notification } = await supabase
      .from("notifications")
      .insert({
        title: `New event: ${event.title}`,
        message: event.description || "Tap to see details.",
        deep_link: `/events/${eventId}`,
        created_by: admin.id,
        audience: notificationAudience,
        cohort_id: event.cohort_id,
        status: "draft",
      })
      .select("id")
      .single();

    if (notification) {
      // Custom-audience events already have their student list in
      // event_participants; mirror it into notification_targets so the
      // shared send pipeline (which reads notification_targets) works.
      if (event.audience_type === "custom") {
        const { data: participants } = await supabase
          .from("event_participants")
          .select("student_id")
          .eq("event_id", eventId);

        const rows = (participants ?? []).map((p) => ({
          notification_id: notification.id,
          student_id: p.student_id,
        }));
        if (rows.length > 0) {
          await supabase.from("notification_targets").insert(rows);
        }
      }

      await sendNotificationCore(supabase, notification.id);
    }
  }

  revalidatePath("/admin/events");
  revalidatePath("/events");
}

export async function cancelEvent(eventId: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("events").update({ status: "cancelled" }).eq("id", eventId);
  revalidatePath("/admin/events");
}

export async function deleteEvent(eventId: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("events").delete().eq("id", eventId);
  revalidatePath("/admin/events");
}
