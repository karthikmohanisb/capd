import { createHmac } from "crypto";

// TOTP-style rotating code: derived from a per-session secret that never
// leaves the server, plus the current time window. Nobody can predict a
// future code without the secret, and the secret is never selectable by
// anyone except admins and this module (see the RLS policies in
// supabase/migrations/0001_init.sql).

export function currentWindowIndex(intervalSeconds: number, at: number = Date.now()): number {
  return Math.floor(at / 1000 / intervalSeconds);
}

export function secondsUntilNextWindow(intervalSeconds: number, at: number = Date.now()): number {
  const elapsedInWindow = Math.floor(at / 1000) % intervalSeconds;
  return intervalSeconds - elapsedInWindow;
}

export function computeAttendanceCode(
  sessionSecretHex: string,
  sessionId: string,
  windowIndex: number
): string {
  const hmac = createHmac("sha256", Buffer.from(sessionSecretHex, "hex"));
  hmac.update(`${sessionId}:${windowIndex}`);
  const digest = hmac.digest();
  const num = digest.readUInt32BE(0) % 1_000_000;
  return num.toString().padStart(6, "0");
}

// Accepts the current window and one window back, giving submitters a
// short grace period for network latency / a code that just rotated.
export function isValidAttendanceCode(
  submitted: string,
  sessionSecretHex: string,
  sessionId: string,
  intervalSeconds: number,
  at: number = Date.now()
): boolean {
  const current = currentWindowIndex(intervalSeconds, at);
  for (const windowIndex of [current, current - 1]) {
    if (computeAttendanceCode(sessionSecretHex, sessionId, windowIndex) === submitted) {
      return true;
    }
  }
  return false;
}
