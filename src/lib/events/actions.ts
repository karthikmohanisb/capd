"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNotificationCore } from "@/lib/notifications/send";
import type { Database } from "@/types/database";
import type { Profile } from "@/lib/auth/dal";

export type ActionState =
  | { error?: string; success?: string; event?: any; session?: any }
  | undefined;

const TITLE_MAX = 120;

async function notifyEventCreated(
  supabase: SupabaseClient<Database>,
  admin: Profile,
  event: {
    id: string;
    title: string;
    description: string | null;
    audience_type: "all" | "cohort" | "custom";
    cohort_id: string | null;
  }
) {
  const notificationAudience = event.audience_type === "custom" ? "selected" : event.audience_type;

  const { data: notification } = await supabase
    .from("notifications")
    .insert({
      title: `New event: ${event.title}`,
      message: event.description || "Tap to see details.",
      deep_link: `/events/${event.id}`,
      created_by: admin.id,
      audience: notificationAudience,
      cohort_id: event.cohort_id,
      status: "draft",
    })
    .select("id")
    .single();

  if (!notification) return;

  // Custom-audience events already have their student list in
  // event_participants; mirror it into notification_targets so the
  // shared send pipeline (which reads notification_targets) works.
  if (event.audience_type === "custom") {
    const { data: participants } = await supabase
      .from("event_participants")
      .select("student_id")
      .eq("event_id", event.id);

    const rows = (participants ?? []).map((p) => ({
      notification_id: notification.id,
      student_id: p.student_id,
    }));
    if (rows.length > 0) {
      await supabase.from("notification_targets").insert(rows);
    }
  }

  await sendNotificationCore(supabase, notification.id);
  revalidatePath("/admin/notifications");
}

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
  const notifyStudents = formData.get("notify_students") === "on";

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
  let attendanceSession: {
    id: string;
    status: string;
    session_secret: string;
    code_interval_seconds: number;
  } | null = null;
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
      .select("id, status, session_secret, code_interval_seconds")
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
    attendanceSession = session;
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
      status: "published",
    })
    .select(
      "id, title, description, location, category, event_at, status, audience_type, cohort_id, attendance_session_id"
    )
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

  if (notifyStudents) {
    await notifyEventCreated(supabase, admin, event);
  }

  revalidatePath("/admin/events");
  revalidatePath("/events");
  return {
    success: notifyStudents
      ? "Event created and students notified."
      : "Event created.",
    event,
    session: attendanceSession,
  };
}

export async function repairAllBrokenEvents() {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const adminClient = createAdminClient();

  // Find all events with dates but missing or broken sessions
  const { data: events } = await supabase
    .from("events")
    .select("id, title, description, event_at, attendance_session_id, created_by, audience_type, cohort_id")
    .eq("status", "published")
    .not("event_at", "is", null);

  let fixed = 0;

  for (const event of events ?? []) {
    // If event has a session_id, verify it exists
    if (event.attendance_session_id) {
      const { data: session } = await adminClient
        .from("attendance_sessions")
        .select("id")
        .eq("id", event.attendance_session_id)
        .maybeSingle();

      if (!session) {
        // Session doesn't exist, create new one
        const { data: newSession } = await supabase
          .from("attendance_sessions")
          .insert({
            title: event.title,
            description: event.description || null,
            created_by: event.created_by,
            code_interval_seconds: 45,
            audience_type: event.audience_type,
            cohort_id: event.cohort_id,
          })
          .select("id")
          .single();

        if (newSession) {
          await supabase
            .from("events")
            .update({ attendance_session_id: newSession.id })
            .eq("id", event.id);
          fixed++;
        }
      }
    } else {
      // No session at all, create one
      const { data: newSession } = await supabase
        .from("attendance_sessions")
        .insert({
          title: event.title,
          description: event.description || null,
          created_by: event.created_by,
          code_interval_seconds: 45,
          audience_type: event.audience_type,
          cohort_id: event.cohort_id,
        })
        .select("id")
        .single();

      if (newSession) {
        await supabase
          .from("events")
          .update({ attendance_session_id: newSession.id })
          .eq("id", event.id);
        fixed++;
      }
    }
  }

  revalidatePath("/admin/events");
  revalidatePath("/events");
  return { success: `Fixed ${fixed} event(s) with missing or broken sessions.` };
}

export async function ensureEventHasSession(eventId: string) {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, title, description, event_at, attendance_session_id, created_by, audience_type, cohort_id")
    .eq("id", eventId)
    .single();

  if (!event) {
    return { error: "Event not found." };
  }

  if (event.attendance_session_id) {
    return { success: "Event already has a session.", sessionId: event.attendance_session_id };
  }

  if (!event.event_at) {
    return { error: "Cannot create session for event without a date." };
  }

  // Create missing session
  const { data: session, error: sessionError } = await supabase
    .from("attendance_sessions")
    .insert({
      title: event.title,
      description: event.description || null,
      created_by: event.created_by,
      code_interval_seconds: 45,
      audience_type: event.audience_type,
      cohort_id: event.cohort_id,
    })
    .select("id, status, session_secret, code_interval_seconds")
    .single();

  if (sessionError || !session) {
    return { error: "Could not create attendance session." };
  }

  // Link session to event
  const { error: updateError } = await supabase
    .from("events")
    .update({ attendance_session_id: session.id })
    .eq("id", eventId);

  if (updateError) {
    return { error: "Could not link session to event." };
  }

  revalidatePath("/admin/events");
  revalidatePath("/events");

  return { success: "Session created and linked.", sessionId: session.id, session };
}

export async function publishEvent(eventId: string, notifyStudents: boolean) {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .update({ status: "published" })
    .eq("id", eventId)
    .select("id, title, description, audience_type, cohort_id")
    .single();

  if (!event) {
    revalidatePath("/admin/events");
    return;
  }

  if (notifyStudents) {
    await notifyEventCreated(supabase, admin, event);
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
