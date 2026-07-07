"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { login } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FormError } from "@/components/ui/field";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, undefined);
  const searchParams = useSearchParams();
  const linkError = searchParams.get("error");

  return (
    <>
      <form action={formAction} className="flex flex-col gap-4">
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@isb.edu"
            required
          />
        </Field>

        <Field label="Password or code" htmlFor="code">
          <Input
            id="code"
            name="code"
            type="password"
            autoComplete="current-password"
            placeholder="Your password, PIN, or temporary code"
            required
          />
        </Field>

        <FormError message={state?.error ?? linkError ?? undefined} />

        <Button type="submit" loading={pending} className="mt-2 w-full">
          Sign in
        </Button>
      </form>

      <p className="mt-4 text-center text-sm">
        <Link href="/forgot-pin" className="text-primary hover:underline">
          Forgot your PIN?
        </Link>
      </p>
    </>
  );
}
