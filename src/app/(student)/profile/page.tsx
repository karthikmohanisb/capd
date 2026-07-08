import { requireStudent } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Mail, Users, HelpCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const student = await requireStudent();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, cohort_id")
    .eq("id", student.id)
    .single();

  let cohortName = "Not assigned";
  if (profile?.cohort_id) {
    const { data: cohort } = await supabase
      .from("cohorts")
      .select("name")
      .eq("id", profile.cohort_id)
      .single();
    cohortName = cohort?.name || "Unknown";
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <h1 className="text-xl font-bold text-foreground">👤 Profile</h1>

      <Card>
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs text-muted">Name</p>
            <p className="font-semibold text-foreground">{profile?.full_name || "No name"}</p>
          </div>
          <div className="flex items-start gap-2">
            <Mail className="h-4 w-4 text-primary mt-1 shrink-0" />
            <div>
              <p className="text-xs text-muted">Email</p>
              <p className="font-mono text-sm break-all">{profile?.email}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Users className="h-4 w-4 text-primary mt-1 shrink-0" />
            <div>
              <p className="text-xs text-muted">Cohort</p>
              <p className="font-semibold">{cohortName}</p>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex gap-3">
          <HelpCircle className="h-5 w-5 text-primary shrink-0 mt-1" />
          <div>
            <p className="font-semibold mb-2">Need Help?</p>
            <p className="text-sm text-muted">📧 capd-support@isb.edu</p>
            <p className="text-xs text-muted mt-1">Mon-Fri, 9 AM - 5 PM IST</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
