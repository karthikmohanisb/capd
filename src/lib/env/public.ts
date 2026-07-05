import { z } from "zod";

// Safe to import from client or server code — only ever reads NEXT_PUBLIC_*
// values, which are already inlined into the browser bundle at build time.
const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_ONESIGNAL_APP_ID: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

let cached: z.infer<typeof schema> | null = null;

export function publicEnv() {
  if (cached) return cached;

  const parsed = schema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_ONESIGNAL_APP_ID: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });

  if (!parsed.success) {
    throw new Error(
      `Missing or invalid public environment variables: ${parsed.error.issues
        .map((issue) => issue.path.join("."))
        .join(", ")}`
    );
  }

  cached = parsed.data;
  return cached;
}
