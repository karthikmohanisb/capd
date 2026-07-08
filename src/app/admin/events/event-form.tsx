"use client";

import { useActionState, useRef, useEffect } from "react";
import { createEvent, type ActionState } from "@/lib/events/actions";
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
}

export function EventForm({
  cohorts,
  students,
}: {
  cohorts: Cohort[];
  students: StudentOption[];
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createEvent, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <Field label="Title" htmlFor="title">
        <Input id="title" name="title" required maxLength={120} placeholder="e.g. Guest Speaker: Jane Doe" />
      </Field>

      <Field label="Description (optional)" htmlFor="description">
        <Textarea id="description" name="description" rows={3} placeholder="Details students should know" />
      </Field>

      <Field label="Date & time (optional)" htmlFor="event_at">
        <Input id="event_at" name="event_at" type="datetime-local" />
      </Field>

      <Field label="Location (optional)" htmlFor="location">
        <Input id="location" name="location" placeholder="e.g. Auditorium" />
      </Field>

      <Field label="Category (optional)" htmlFor="category">
        <Input id="category" name="category" placeholder="e.g. Professional Club" />
      </Field>

      <AudiencePicker cohorts={cohorts} students={students} />

      <FormError message={state?.error} />
      {state?.success && <p className="text-sm font-medium text-success">{state.success}</p>}

      <Button type="submit" loading={pending} className="w-full">
        Save as draft
      </Button>
    </form>
  );
}
