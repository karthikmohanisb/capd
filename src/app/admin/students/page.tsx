import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { Button } from "@/components/ui/button";
import { StudentList } from "./student-list";

export default async function AdminStudentsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [students, { data: cohorts }] = await Promise.all([
    fetchAllRows((from, to) =>
      supabase
        .from("profiles")
        .select("id, email, full_name, student_number, status, cohort_id")
        .eq("role", "student")
        .order("email", { ascending: true })
        .range(from, to)
    ),
    supabase.from("cohorts").select("id, name"),
  ]);

  const cohortNameById = new Map((cohorts ?? []).map((c) => [c.id, c.name]));
  const studentsWithCohort = students.map((s) => ({
    ...s,
    cohortName: s.cohort_id ? cohortNameById.get(s.cohort_id) ?? null : null,
  }));

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Students</h1>
          <p className="mt-1 text-sm text-muted">
            Search a student to reset their PIN if they&apos;re locked out.
          </p>
        </div>
        <Link href="/admin/students/import">
          <Button type="button" variant="secondary" className="px-3 py-2 text-xs">
            Import
          </Button>
        </Link>
      </div>

      <StudentList students={studentsWithCohort} />
    </div>
  );
}
