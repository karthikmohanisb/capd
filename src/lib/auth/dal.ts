import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

// cache() dedupes this within a single request/render pass, so pages,
// layouts, and components can all call it without extra round trips.
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile ?? null;
});

async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile || profile.status !== "active") {
    redirect("/login");
  }
  if (profile.must_set_pin) {
    redirect("/set-pin");
  }
  return profile;
}

// Use at the top of every student page/Server Action. Redirects an admin
// account to "/" (which sends it on to /admin) rather than logging it out.
export async function requireStudent(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== "student") {
    redirect("/");
  }
  return profile;
}

// Use at the top of every admin page/Server Action.
export async function requireAdmin(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== "admin") {
    redirect("/");
  }
  return profile;
}
