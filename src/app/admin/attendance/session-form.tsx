"use client";

import { useActionState, useRef, useEffect } from "react";
import { createSession, type ActionState } from "@/lib/attendance/actions";
import { AudiencePicker } from "@/components/audience-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FormError } from "@/components/ui/field";

interface Cohort {
  id: string;
  name: string;
}

interface StudentOption {
  id: string;
  email: string;
  full_name: string | null;
}

export function SessionForm({
  cohorts,
  students,
}: {
  cohorts: Cohort[];
  students: StudentOption[];
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createSession,
    undefined
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <Field label="Session title" htmlFor="title">
        <Input id="title" name="title" placeholder="e.g. Monday Orientation" required maxLength={120} />
      </Field>

      <Field label="Description (optional)" htmlFor="description">
        <Input id="description" name="description" placeholder="Optional notes" />
      </Field>

      <Field label="Code changes every (seconds)" htmlFor="code_interval_seconds">
        <Input
          id="code_interval_seconds"
          name="code_interval_seconds"
          type="number"
          min={15}
          max={300}
          defaultValue={45}
        />
      </Field>

      <AudiencePicker cohorts={cohorts} students={students} />

      <FormError message={state?.error} />

      <Button type="submit" loading={pending} className="w-full">
        Create session
      </Button>
    </form>
  );
}
