"use server";

import { requireStudent } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { sendPushNotification } from "@/lib/onesignal/client";

export type RegisterState = { error?: string; success?: boolean } | undefined;

function detectDeviceType(userAgent: string): string {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "ios";
  if (/Android/i.test(userAgent)) return "android";
  return "desktop";
}

function detectBrowser(userAgent: string): string {
  if (/Edg\//i.test(userAgent)) return "Edge";
  if (/Chrome\//i.test(userAgent)) return "Chrome";
  if (/Safari\//i.test(userAgent) && !/Chrome/i.test(userAgent)) return "Safari";
  if (/Firefox\//i.test(userAgent)) return "Firefox";
  return "Unknown";
}

export async function registerPushSubscription(
  subscriptionId: string,
  userAgent: string
): Promise<RegisterState> {
  const student = await requireStudent();

  if (!subscriptionId) {
    return { error: "No subscription id was provided." };
  }

  const supabase = await createClient();

  // Conflict target is onesignal_subscription_id (globally unique). If this
  // exact browser subscription was previously registered by a different
  // student (e.g. a shared computer), the RLS update policy blocks the
  // reassignment rather than silently handing the device to a new identity.
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        student_id: student.id,
        onesignal_subscription_id: subscriptionId,
        device_type: detectDeviceType(userAgent),
        browser: detectBrowser(userAgent),
        user_agent: userAgent,
        is_active: true,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "onesignal_subscription_id" }
    );

  if (error) {
    if (error.code === "42501" || error.message.toLowerCase().includes("row-level security")) {
      return {
        error:
          "This device is already registered to a different account. Try a different browser or clear this browser's data.",
      };
    }
    return { error: "Could not save your device. Please try again." };
  }

  return { success: true };
}

export async function sendTestNotification(subscriptionId: string): Promise<RegisterState> {
  const student = await requireStudent();
  const supabase = await createClient();

  const { data: subscription } = await supabase
    .from("push_subscriptions")
    .select("onesignal_subscription_id, student_id")
    .eq("onesignal_subscription_id", subscriptionId)
    .single();

  if (!subscription || subscription.student_id !== student.id) {
    return { error: "That device isn't registered to your account." };
  }

  const result = await sendPushNotification({
    subscriptionIds: [subscriptionId],
    title: "Test notification",
    message: "If you can see this, notifications are working on this device.",
  });

  if (!result.ok) {
    return { error: result.errorMessage ?? "Could not send the test notification." };
  }

  return { success: true };
}
