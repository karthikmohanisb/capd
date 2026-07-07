"use server";

import { requireAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ResetPinState = { error?: string; tempPasscode?: string } | undefined;

function generateTempPasscode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Admin override for a student who can't access their email to self-serve
// a reset. Sets a fresh temporary passcode (same idea as first-time import)
// and flags the account so they're walked through creating a new PIN on
// next login, exactly like a brand-new student.
export async function resetStudentPin(studentId: string): Promise<ResetPinState> {
  await requireAdmin();

  const tempPasscode = generateTempPasscode();
  const admin = createAdminClient();

  const { error: authError } = await admin.auth.admin.updateUserById(studentId, {
    password: tempPasscode,
  });

  if (authError) {
    return { error: `Could not reset this student's PIN: ${authError.message}` };
  }

  const supabase = await createClient();
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ must_set_pin: true })
    .eq("id", studentId);

  if (profileError) {
    return { error: "Password was reset, but could not flag the account for PIN setup." };
  }

  return { tempPasscode };
}
