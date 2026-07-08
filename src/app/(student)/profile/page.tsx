import { requireStudent } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Mail, Users, HelpCircle } from "lucide-react";

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
      <div>
        <h1 className="text-xl font-bold text-foreground">👤 Profile</h1>
        <p className="text-sm text-muted mt-1">Your account information</p>
      </div>

      {/* Student Info Card */}
      <Card>
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs text-muted">Name</p>
            <p className="font-semibold text-foreground">{profile?.full_name || "No name set"}</p>
          </div>

          <div className="flex items-start gap-2">
            <Mail className="h-4 w-4 text-primary mt-1 shrink-0" />
            <div>
              <p className="text-xs text-muted">Email</p>
              <p className="font-mono text-sm text-foreground break-all">{profile?.email}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Users className="h-4 w-4 text-primary mt-1 shrink-0" />
            <div>
              <p className="text-xs text-muted">Cohort</p>
              <p className="font-semibold text-foreground">{cohortName}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Support Card */}
      <Card>
        <div className="flex items-start gap-3">
          <HelpCircle className="h-5 w-5 text-primary shrink-0 mt-1" />
          <div className="flex-1">
            <p className="font-semibold text-foreground mb-2">Need Help?</p>
            <p className="text-sm text-muted mb-3">
              Have questions about CAPD or need technical support?
            </p>
            <p className="text-xs text-muted">
              📧 <strong>Support Email:</strong><br />
              <span className="font-mono">capd-support@isb.edu</span>
            </p>
            <p className="text-xs text-muted mt-2">
              ⏰ <strong>Support Hours:</strong><br />
              Mon-Fri, 9 AM - 5 PM IST
            </p>
          </div>
        </div>
      </Card>

      {/* Quick Tips */}
      <Card>
        <div>
          <p className="font-semibold text-foreground mb-3">💡 Quick Tips</p>
          <ul className="text-sm text-muted space-y-2 flex flex-col gap-2">
            <li>✓ Check Events calendar for upcoming sessions</li>
            <li>✓ Click an event to check in with the 6-digit code</li>
            <li>✓ Enable notifications in your device for instant alerts</li>
            <li>✓ Bookmark this app for quick access anytime</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
