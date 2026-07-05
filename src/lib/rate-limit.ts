import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;

// Counts recent hits for a (student, scope) pair and records this attempt.
// Backed by a small Postgres table rather than an in-memory map, since
// Vercel can run multiple serverless instances — an in-memory counter
// would let each instance track attempts independently and undercount.
export async function checkAndRecordRateLimit(
  supabase: SupabaseClient<Database>,
  studentId: string,
  scope: string
): Promise<{ allowed: boolean }> {
  const since = new Date(Date.now() - WINDOW_MS).toISOString();

  const { count } = await supabase
    .from("rate_limit_hits")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .eq("scope", scope)
    .gte("created_at", since);

  if ((count ?? 0) >= MAX_ATTEMPTS) {
    return { allowed: false };
  }

  await supabase.from("rate_limit_hits").insert({ student_id: studentId, scope });
  return { allowed: true };
}
