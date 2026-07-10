"use client";

import { useActionState, useRef, useState, useEffect } from "react";
import { createNotification, type ActionState } from "@/lib/notifications/actions";
import { AudiencePicker } from "@/components/audience-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormError } from "@/components/ui/field";

interface Cohort {
  id: string;
  name: string;
}

interface StudentOption {
  id: string;
  email: string;
  full_name: string | null;
  cohort_id?: string | null;
}

export function ComposeForm({ cohorts, students }: { cohorts: Cohort[]; students: StudentOption[] }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createNotification,
    undefined
  );
  const [sendMode, setSendMode] = useState<"now" | "schedule">("now");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      setSendMode("now");
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <Field label="Title" htmlFor="title">
        <Input id="title" name="title" required maxLength={120} placeholder="e.g. Attendance is open" />
      </Field>

      <Field label="Message" htmlFor="message">
        <Textarea id="message" name="message" required maxLength={500} rows={3} placeholder="Notification text" />
      </Field>

      <Field label="Link when tapped (optional)" htmlFor="deep_link">
        <Input id="deep_link" name="deep_link" placeholder="/attendance" />
      </Field>

      <AudiencePicker cohorts={cohorts} students={students} />

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium text-foreground">When</legend>
        <div className="flex gap-4">
          <label className="flex items-center gap-1.5 text-sm text-foreground">
            <input
              type="radio"
              name="send_mode"
              value="now"
              checked={sendMode === "now"}
              onChange={() => setSendMode("now")}
            />
            Send now
          </label>
          <label className="flex items-center gap-1.5 text-sm text-foreground">
            <input
              type="radio"
              name="send_mode"
              value="schedule"
              checked={sendMode === "schedule"}
              onChange={() => setSendMode("schedule")}
            />
            Schedule for later
          </label>
        </div>
      </fieldset>

      {sendMode === "schedule" && (
        <div className="flex flex-col gap-1.5">
          <Input type="datetime-local" name="scheduled_at" required />
          <p className="text-xs text-warning">
            Scheduled notifications are checked once a day, so this may go out up to 24 hours
            after the time you pick. For anything time-sensitive, use &quot;Send now&quot;
            instead.
          </p>
        </div>
      )}

      <FormError message={state?.error} />
      {state?.success && <p className="text-sm font-medium text-success">{state.success}</p>}

      <Button type="submit" loading={pending} className="mt-2 w-full">
        {sendMode === "schedule" ? "Schedule notification" : "Send notification"}
      </Button>
    </form>
  );
}
