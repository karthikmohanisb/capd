import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNotificationCore } from "@/lib/notifications/send";
import { serverEnv } from "@/lib/env/server";

// Triggered by Vercel Cron (see vercel.json), which automatically sends
// `Authorization: Bearer ${CRON_SECRET}`. No user session exists here, so
// this is one of the few legitimate uses of the service-role client.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const { CRON_SECRET } = serverEnv();

  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: due } = await supabase
    .from("notifications")
    .select("id")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString());

  const results = [];
  for (const notification of due ?? []) {
    const result = await sendNotificationCore(supabase, notification.id);
    results.push({ id: notification.id, ok: result.ok });
  }

  return NextResponse.json({ processed: results.length, results });
}
