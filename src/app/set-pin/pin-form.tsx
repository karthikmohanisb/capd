"use client";

import { useActionState } from "react";
import { setPin } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FormError } from "@/components/ui/field";

export function PinForm() {
  const [state, formAction, pending] = useActionState(setPin, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="New PIN" htmlFor="pin">
        <Input
          id="pin"
          name="pin"
          type="password"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          autoComplete="new-password"
          placeholder="6 digits"
          required
        />
      </Field>

      <Field label="Confirm PIN" htmlFor="confirmPin">
        <Input
          id="confirmPin"
          name="confirmPin"
          type="password"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          autoComplete="new-password"
          placeholder="6 digits"
          required
        />
      </Field>

      <FormError message={state?.error} />

      <Button type="submit" loading={pending} className="mt-2 w-full">
        Save PIN and continue
      </Button>
    </form>
  );
}
