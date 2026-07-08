import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const secret = new URL(request.url).searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("attendance_sessions")
      .select("id, status")
      .limit(1);

    return NextResponse.json({ ok: !error, data, error: error?.message ?? null });
  } catch (e) {
    return NextResponse.json({ ok: false, thrown: String(e) });
  }
}
