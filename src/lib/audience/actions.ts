"use server";

import { requireAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export interface MatchResult {
  matchedIds: string[];
  unmatchedEmails: string[];
}

// Used by AudiencePicker's "upload a roster file" mode for a one-off custom
// audience (e.g. a club session) — matches uploaded emails against existing
// students rather than creating new accounts (that's the import wizard's job).
export async function matchStudentsByEmail(emails: string[]): Promise<MatchResult> {
  await requireAdmin();

  const normalized = Array.from(
    new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))
  );

  if (normalized.length === 0) {
    return { matchedIds: [], unmatchedEmails: [] };
  }

  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, email").in("email", normalized);

  const foundEmails = new Set((data ?? []).map((p) => p.email));
  const unmatchedEmails = normalized.filter((e) => !foundEmails.has(e));

  return { matchedIds: (data ?? []).map((p) => p.id), unmatchedEmails };
}
