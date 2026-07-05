"use client";

import { useActionState } from "react";
import { markAttendance, type MarkAttendanceState } from "@/lib/attendance/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormError } from "@/components/ui/field";

export function CodeForm({ sessionId }: { sessionId: string }) {
  const [state, formAction, pending] = useActionState<MarkAttendanceState, FormData>(
    markAttendance,
    undefined
  );

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-2">
      <input type="hidden" name="session_id" value={sessionId} />
      <div className="flex gap-2">
        <Input
          name="code"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          placeholder="6-digit code"
          required
          className="flex-1 text-center font-mono text-lg tracking-widest"
        />
        <Button type="submit" loading={pending} className="px-4">
          Submit
        </Button>
      </div>
      <FormError message={state?.error} />
      {state?.success && state.message && (
        <p className="text-sm font-medium text-success">{state.message}</p>
      )}
    </form>
  );
}
