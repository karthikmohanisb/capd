"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireStudent } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidAttendanceCode } from "./code";
import { checkAndRecordRateLimit } from "@/lib/rate-limit";
import { sendNotificationCore } from "@/lib/notifications/send";

export type ActionState = { error?: string; success?: string } | undefined;

const TITLE_MAX = 120;

export async function createSession(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const intervalRaw = Number(formData.get("code_interval_seconds"));
  const interval = Number.isFinite(intervalRaw)
    ? Math.min(300, Math.max(15, Math.round(intervalRaw)))
    : 45;

  if (!title || title.length > TITLE_MAX) {
    return { error: "Enter a session title (up to 120 characters)." };
  }

  const audienceType = formData.get("audience_type") === "cohort" || formData.get("audience_type") === "custom"
    ? (formData.get("audience_type") as "cohort" | "custom")
    : "all";
  const cohortId = audienceType === "cohort" ? String(formData.get("cohort_id") ?? "") || null : null;
  const studentIds = audienceType === "custom" ? formData.getAll("student_ids").map(String).filter(Boolean) : [];

  if (audienceType === "cohort" && !cohortId) {
    return { error: "Choose a cohort." };
  }
  if (audienceType === "custom" && studentIds.length === 0) {
    return { error: "Select at least one student for the custom list." };
  }

  const supabase = await createClient();
  const { data: session, error } = await supabase
    .from("attendance_sessions")
    .insert({
      title,
      description: description || null,
      created_by: admin.id,
      code_interval_seconds: interval,
      audience_type: audienceType,
      cohort_id: cohortId,
    })
    .select("id")
    .single();

  if (error || !session) {
    return { error: "Could not create the session. Please try again." };
  }

  if (audienceType === "custom") {
    const rows = studentIds.map((studentId) => ({ session_id: session.id, student_id: studentId }));
    const { error: participantsError } = await supabase
      .from("attendance_session_participants")
      .insert(rows);
    if (participantsError) {
      return { error: "Session created, but saving the custom list failed. Please try again." };
    }
  }

  revalidatePath("/admin/attendance");
  return { success: "Session created." };
}

export async function openSession(sessionId: string, notifyStudents = false) {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const { data: session } = await supabase
    .from("attendance_sessions")
    .update({ status: "open", opened_at: new Date().toISOString() })
    .eq("id", sessionId)
    .select("title")
    .single();

  if (notifyStudents && session) {
    const { data: notification } = await supabase
      .from("notifications")
      .insert({
        title: "Attendance is open",
        message: `Attendance for "${session.title}" is now open. Tap to check in.`,
        deep_link: "/attendance",
        created_by: admin.id,
        audience: "all",
        status: "draft",
      })
      .select("id")
      .single();

    if (notification) {
      await sendNotificationCore(supabase, notification.id);
    }
    revalidatePath("/admin/notifications");
  }

  revalidatePath("/admin/attendance");
  revalidatePath(`/admin/attendance/${sessionId}`);
}

export async function closeSession(sessionId: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase
    .from("attendance_sessions")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("id", sessionId);

  revalidatePath("/admin/attendance");
  revalidatePath(`/admin/attendance/${sessionId}`);
}

export async function deleteSession(sessionId: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("attendance_sessions").delete().eq("id", sessionId);

  revalidatePath("/admin/attendance");
  redirect("/admin/attendance");
}

export type MarkAttendanceState =
  | { error?: string; success?: boolean; message?: string }
  | undefined;

export async function markAttendance(
  _prevState: MarkAttendanceState,
  formData: FormData
): Promise<MarkAttendanceState> {
  const student = await requireStudent();
  const sessionId = String(formData.get("session_id") ?? "");
  const code = String(formData.get("code") ?? "").trim();

  if (!sessionId || !/^\d{6}$/.test(code)) {
    return { error: "Enter the 6-digit code shown by your instructor." };
  }

  const supabase = await createClient();

  const { allowed } = await checkAndRecordRateLimit(
    supabase,
    student.id,
    `attendance:${sessionId}`
  );
  if (!allowed) {
    return { error: "Too many attempts. Please wait a minute and try again." };
  }

  // Only admins can select session_secret directly (see 0001_init.sql RLS).
  // This is the one narrow, read-only use of the service-role key here:
  // recomputing the expected code server-side. The secret itself never
  // reaches the student.
  const admin = createAdminClient();
  const { data: session, error: sessionError } = await admin
    .from("attendance_sessions")
    .select("id, status, session_secret, code_interval_seconds, audience_type, cohort_id")
    .eq("id", sessionId)
    .abortSignal(AbortSignal.timeout(8000))
    .single();

  if (sessionError || !session) {
    return { error: "That session could not be found." };
  }

  if (session.status !== "open") {
    return { error: "This attendance session is not currently open." };
  }

  // Defense in depth: the student-facing view already hides sessions
  // outside a student's audience, but a shared/leaked code shouldn't work
  // for them either — re-check membership here, not just visibility.
  if (session.audience_type === "cohort") {
    const { data: profile } = await admin
      .from("profiles")
      .select("cohort_id")
      .eq("id", student.id)
      .single();
    if (!profile || profile.cohort_id !== session.cohort_id) {
      return { error: "This attendance session isn't open to you." };
    }
  } else if (session.audience_type === "custom") {
    const { data: participant } = await admin
      .from("attendance_session_participants")
      .select("id")
      .eq("session_id", sessionId)
      .eq("student_id", student.id)
      .maybeSingle();
    if (!participant) {
      return { error: "This attendance session isn't open to you." };
    }
  }

  const valid = isValidAttendanceCode(
    code,
    session.session_secret,
    session.id,
    session.code_interval_seconds
  );

  if (!valid) {
    return { error: "That code is incorrect or has expired. Check and try again." };
  }

  // The unique(session_id, student_id) constraint makes this race-safe
  // even if the same student double-taps submit or opens two tabs.
  const { error: insertError } = await supabase
    .from("attendance_records")
    .insert({ session_id: sessionId, student_id: student.id })
    .abortSignal(AbortSignal.timeout(8000));

  if (insertError) {
    if (insertError.code === "23505") {
      return { success: true, message: "You already marked attendance for this session." };
    }
    return { error: "Could not record your attendance. Please try again." };
  }

  revalidatePath("/attendance");
  return { success: true, message: "Attendance recorded — you're marked present." };
}
