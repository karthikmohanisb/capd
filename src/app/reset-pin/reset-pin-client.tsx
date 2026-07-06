"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PinForm } from "@/components/pin-form";

type Status = "checking" | "ready" | "invalid";

export function ResetPinClient() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        setStatus("ready");
      }
    });

    // Covers a page reload after the recovery session was already
    // established (the auth-state-change event only fires once, on the
    // initial hash processing).
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setStatus("ready");
    });

    const timeout = setTimeout(() => {
      setStatus((current) => (current === "checking" ? "invalid" : current));
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  if (status === "checking") {
    return <p className="text-center text-sm text-muted">Checking your reset link…</p>;
  }

  if (status === "invalid") {
    return (
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm text-danger">That reset link is invalid or has expired.</p>
        <Link href="/forgot-pin" className="text-sm text-primary hover:underline">
          Request a new link
        </Link>
      </div>
    );
  }

  return <PinForm />;
}
