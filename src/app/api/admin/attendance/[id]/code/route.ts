import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import {
  computeAttendanceCode,
  currentWindowIndex,
  secondsUntilNextWindow,
} from "@/lib/attendance/code";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  const { data: session, error } = await supabase
    .from("attendance_sessions")
    .select("id, status, session_secret, code_interval_seconds")
    .eq("id", id)
    .single();

  if (error || !session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const [{ count: present }, { count: total }] = await Promise.all([
    supabase
      .from("attendance_records")
      .select("id", { count: "exact", head: true })
      .eq("session_id", id),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "student")
      .eq("status", "active"),
  ]);

  if (session.status !== "open") {
    return NextResponse.json({
      status: session.status,
      present: present ?? 0,
      total: total ?? 0,
    });
  }

  const windowIndex = currentWindowIndex(session.code_interval_seconds);
  const code = computeAttendanceCode(session.session_secret, session.id, windowIndex);
  const secondsRemaining = secondsUntilNextWindow(session.code_interval_seconds);

  return NextResponse.json({
    status: session.status,
    code,
    secondsRemaining,
    intervalSeconds: session.code_interval_seconds,
    present: present ?? 0,
    total: total ?? 0,
  });
}
