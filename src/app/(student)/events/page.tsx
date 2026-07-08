import { requireStudent } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { WeekCalendar } from "@/components/week-calendar";

export default async function EventsPage() {
  await requireStudent();
  const supabase = await createClient();

  const { data: events } = await supabase
    .from("published_events")
    .select("id, title, description, location, category, event_at, attendance_session_id")
    .order("event_at", { ascending: true, nullsFirst: false });

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">📅 Events Calendar</h1>
        <p className="text-sm text-muted mt-1">Your week at a glance</p>
      </div>

      <WeekCalendar events={events ?? []} />
    </div>
  );
}
