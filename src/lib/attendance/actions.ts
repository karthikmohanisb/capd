"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireStudent } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidAttendanceCode } from "./code";
import { checkAndRecordRateLimit } from "@/lib/rate-limit";

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

  const supabase = await createClient();
  const { error } = await supabase.from("attendance_sessions").insert({
    title,
    description: description || null,
    created_by: admin.id,
    code_interval_seconds: interval,
  });

  if (error) {
    return { error: "Could not create the session. Please try again." };
  }

  revalidatePath("/admin/attendance");
  return { success: "Session created." };
}

export async function openSession(sessionId: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase
    .from("attendance_sessions")
    .update({ status: "open", opened_at: new Date().toISOString() })
    .eq("id", sessionId);

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
    .select("id, status, session_secret, code_interval_seconds")
    .eq("id", sessionId)
    .abortSignal(AbortSignal.timeout(8000))
    .single();

  if (sessionError || !session) {
    return { error: "That session could not be found." };
  }

  if (session.status !== "open") {
    return { error: "This attendance session is not currently open." };
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
