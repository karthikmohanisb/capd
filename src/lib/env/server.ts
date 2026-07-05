import "server-only";
import { z } from "zod";

// Secrets only. Importing this file from a Client Component is a build
// error (enforced by the "server-only" package), which is the point.
const schema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ONESIGNAL_REST_API_KEY: z.string().min(1),
  CRON_SECRET: z.string().min(1),
});

let cached: z.infer<typeof schema> | null = null;

export function serverEnv() {
  if (cached) return cached;

  const parsed = schema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ONESIGNAL_REST_API_KEY: process.env.ONESIGNAL_REST_API_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
  });

  if (!parsed.success) {
    throw new Error(
      `Missing or invalid server environment variables: ${parsed.error.issues
        .map((issue) => issue.path.join("."))
        .join(", ")}`
    );
  }

  cached = parsed.data;
  return cached;
}
