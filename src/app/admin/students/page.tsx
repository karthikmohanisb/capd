import { requireAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { StudentList } from "./student-list";

export default async function AdminStudentsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: students } = await supabase
    .from("profiles")
    .select("id, email, full_name, student_number, status")
    .eq("role", "student")
    .order("email", { ascending: true });

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Students</h1>
        <p className="mt-1 text-sm text-muted">
          Search a student to reset their PIN if they&apos;re locked out.
        </p>
      </div>

      <StudentList students={students ?? []} />
    </div>
  );
}
