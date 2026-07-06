"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { publicEnv } from "@/lib/env/public";
import { registerPushSubscription, sendTestNotification } from "@/lib/push/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// No official TypeScript types are published for the OneSignal Web SDK
// global; this covers only the surface we actually use.
interface OneSignalSdk {
  init: (options: { appId: string }) => Promise<void>;
  Notifications: { requestPermission: () => Promise<void> };
  User: {
    PushSubscription: {
      id?: string;
      optedIn?: boolean;
      addEventListener: (event: "change", cb: () => void) => void;
      removeEventListener: (event: "change", cb: () => void) => void;
    };
  };
}

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: OneSignalSdk) => void>;
  }
}

// Module-level (not component state): OneSignal.init() must run at most
// once per page load, even if this component unmounts/remounts.
let didInit = false;

type Status = "loading" | "unsupported" | "denied" | "disabled" | "enabling" | "ready" | "error";

export function NotificationsCard() {
  const [sdkReady, setSdkReady] = useState(false);
  const [status, setStatus] = useState<Status>("loading");
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [testState, setTestState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const oneSignalRef = useRef<OneSignalSdk | null>(null);

  useEffect(() => {
    if (!sdkReady) return;

    let cancelled = false;
    let attachedOneSignal: OneSignalSdk | null = null;
    let attachedHandler: (() => void) | null = null;

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      if (cancelled) return;
      oneSignalRef.current = OneSignal;

      if (!didInit) {
        didInit = true;
        await OneSignal.init({ appId: publicEnv().NEXT_PUBLIC_ONESIGNAL_APP_ID });
      }

      if (typeof Notification === "undefined" || !("serviceWorker" in navigator)) {
        if (!cancelled) setStatus("unsupported");
        return;
      }

      const sync = async () => {
        if (Notification.permission === "denied") {
          if (!cancelled) setStatus("denied");
          return;
        }

        const id = OneSignal.User.PushSubscription.id;
        const optedIn = OneSignal.User.PushSubscription.optedIn;

        if (id && optedIn) {
          if (!cancelled) setSubscriptionId(id);
          const result = await registerPushSubscription(id, navigator.userAgent);
          if (cancelled) return;
          if (result?.error) {
            setStatus("error");
            setErrorMessage(result.error);
          } else {
            setStatus("ready");
          }
        } else if (!cancelled) {
          setStatus("disabled");
        }
      };

      OneSignal.User.PushSubscription.addEventListener("change", sync);
      attachedOneSignal = OneSignal;
      attachedHandler = sync;
      await sync();
    });

    return () => {
      cancelled = true;
      if (attachedOneSignal && attachedHandler) {
        attachedOneSignal.User.PushSubscription.removeEventListener("change", attachedHandler);
      }
    };
  }, [sdkReady]);

  const enableNotifications = useCallback(async () => {
    setStatus("enabling");
    setErrorMessage(null);
    try {
      await oneSignalRef.current?.Notifications.requestPermission();
      if (Notification.permission === "denied") {
        setStatus("denied");
      }
    } catch {
      setStatus("error");
      setErrorMessage("Could not request permission. Please try again.");
    }
  }, []);

  const runTest = useCallback(async () => {
    if (!subscriptionId) return;
    setTestState("sending");
    const result = await sendTestNotification(subscriptionId);
    setTestState(result?.error ? "error" : "sent");
  }, [subscriptionId]);

  return (
    <>
      <Script
        src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
        strategy="afterInteractive"
        onReady={() => setSdkReady(true)}
      />
      <Card>
        <p className="font-medium text-foreground">Push notifications</p>

        {status === "loading" && <p className="mt-1 text-sm text-muted">Checking status…</p>}

        {status === "unsupported" && (
          <p className="mt-1 text-sm text-muted">
            Notifications aren&apos;t supported in this browser. On iPhone, add this site to
            your Home Screen first (Share → Add to Home Screen), then open it from there.
          </p>
        )}

        {status === "denied" && (
          <p className="mt-1 text-sm text-danger">
            Notifications are blocked for this site. Enable them in your browser&apos;s site
            settings, then reload this page.
          </p>
        )}

        {status === "disabled" && (
          <div className="mt-2 flex flex-col gap-2">
            <p className="text-sm text-muted">
              Turn on notifications to get attendance and announcement alerts.
            </p>
            <Button type="button" onClick={enableNotifications} className="w-full">
              Enable notifications
            </Button>
          </div>
        )}

        {status === "enabling" && (
          <p className="mt-1 text-sm text-muted">Requesting permission…</p>
        )}

        {status === "error" && (
          <div className="mt-2 flex flex-col gap-2">
            <p className="text-sm text-danger">{errorMessage ?? "Something went wrong."}</p>
            <Button type="button" variant="secondary" onClick={enableNotifications} className="w-full">
              Try again
            </Button>
          </div>
        )}

        {status === "ready" && (
          <div className="mt-2 flex flex-col gap-2">
            <p className="text-sm font-medium text-success">Notifications ready ✓</p>
            <Button
              type="button"
              variant="secondary"
              loading={testState === "sending"}
              onClick={runTest}
              className="w-full text-xs"
            >
              Send test notification to this device
            </Button>
            {testState === "sent" && (
              <p className="text-xs text-success">Sent — check for it in a moment.</p>
            )}
            {testState === "error" && (
              <p className="text-xs text-danger">Could not send the test notification.</p>
            )}
          </div>
        )}
      </Card>
    </>
  );
}
