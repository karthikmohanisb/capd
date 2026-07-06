import "server-only";
import { publicEnv } from "@/lib/env/public";
import { serverEnv } from "@/lib/env/server";

const ONESIGNAL_API_URL = "https://api.onesignal.com/notifications";

export interface SendPushResult {
  ok: boolean;
  oneSignalId?: string;
  recipients: number;
  invalidSubscriptionIds: string[];
  errorMessage?: string;
}

export async function sendPushNotification(params: {
  subscriptionIds: string[];
  title: string;
  message: string;
  url?: string;
}): Promise<SendPushResult> {
  const { subscriptionIds, title, message, url } = params;

  if (subscriptionIds.length === 0) {
    return { ok: false, recipients: 0, invalidSubscriptionIds: [], errorMessage: "No recipients." };
  }

  const env = publicEnv();
  const secrets = serverEnv();

  let response: Response;
  try {
    response = await fetch(ONESIGNAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${secrets.ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
        include_subscription_ids: subscriptionIds,
        target_channel: "push",
        headings: { en: title },
        contents: { en: message },
        ...(url ? { url } : {}),
      }),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    return {
      ok: false,
      recipients: 0,
      invalidSubscriptionIds: [],
      errorMessage: "Could not reach OneSignal (network error or timeout).",
    };
  }

  const body = await response.json().catch(() => ({}));

  if (!response.ok || !body.id) {
    // OneSignal has used a few different field names for "these ids didn't
    // work" across API versions — check the ones we know about rather than
    // assuming one, and never throw if the shape is unexpected.
    const invalid: string[] = [
      ...(body?.errors?.invalid_subscription_ids ?? []),
      ...(body?.errors?.invalid_player_ids ?? []),
      ...(body?.errors?.invalid_external_ids ?? []),
    ];
    return {
      ok: false,
      recipients: 0,
      invalidSubscriptionIds: invalid,
      errorMessage: typeof body?.errors === "string" ? body.errors : JSON.stringify(body?.errors ?? body),
    };
  }

  return {
    ok: true,
    oneSignalId: body.id,
    recipients: body.recipients ?? 0,
    invalidSubscriptionIds: [],
  };
}
