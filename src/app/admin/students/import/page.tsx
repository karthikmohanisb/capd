import { requireAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { ImportWizard } from "./import-wizard";

export default async function AdminStudentImportPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: cohorts } = await supabase
    .from("cohorts")
    .select("id, name")
    .order("name", { ascending: true });

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Import students</h1>
        <p className="mt-1 text-sm text-muted">
          Upload an Excel or CSV file to add or update students in bulk.
        </p>
      </div>

      <ImportWizard initialCohorts={cohorts ?? []} />
    </div>
  );
}
