import { requireStudent } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { StudentEventsClient } from "./client";

export default async function EventsPage() {
  await requireStudent();
  const supabase = await createClient();

  const { data: events } = await supabase
    .from("published_events")
    .select("id, title, description, location, category, event_at, attendance_session_id")
    .order("event_at", { ascending: true, nullsFirst: false });

  return <StudentEventsClient events={events ?? []} />;
}
