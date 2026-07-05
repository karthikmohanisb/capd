import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { publicEnv } from "@/lib/env/public";
import { serverEnv } from "@/lib/env/server";

// Bypasses Row Level Security entirely. Only use for the narrow, documented
// cases where no user session can express the required access:
//   - CSV/Excel student import (creating Supabase Auth users in bulk)
//   - Attendance code validation (reading a session's rotation secret)
//   - The notification send/cron pipeline (runs with no logged-in session)
// Never import this file into a Client Component.
export function createAdminClient() {
  const env = publicEnv();
  const secrets = serverEnv();

  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    secrets.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
