import { requireAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("attendance_sessions")
    .select("id, title")
    .eq("id", id)
    .single();

  if (!session) {
    return new Response("Session not found.", { status: 404 });
  }

  const [{ data: allStudents }, { data: records }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, student_number")
      .eq("role", "student")
      .eq("status", "active")
      .order("email", { ascending: true }),
    supabase.from("attendance_records").select("student_id, marked_at").eq("session_id", id),
  ]);

  const markedByStudent = new Map((records ?? []).map((r) => [r.student_id, r.marked_at]));

  const rows = [
    ["Email", "Full name", "Student number", "Status", "Marked at"],
    ...(allStudents ?? []).map((student) => {
      const markedAt = markedByStudent.get(student.id);
      return [
        student.email,
        student.full_name ?? "",
        student.student_number ?? "",
        markedAt ? "present" : "absent",
        markedAt ?? "",
      ];
    }),
  ];

  const csv = rows.map((row) => row.map((cell) => csvEscape(String(cell ?? ""))).join(",")).join("\n");
  const filename = `attendance-${session.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
