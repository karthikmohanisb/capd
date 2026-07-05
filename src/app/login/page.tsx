"use client";

import { useActionState } from "react";
import { login } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FormError } from "@/components/ui/field";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-foreground">CAPD</h1>
          <p className="mt-1 text-sm text-muted">Sign in with your institutional email</p>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@institution.edu"
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

          <FormError message={state?.error} />

          <Button type="submit" loading={pending} className="mt-2 w-full">
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted">
          Students, first time signing in? Use the temporary code your administrator shared
          with you — you&apos;ll be asked to create a personal PIN right after.
        </p>
      </div>
    </main>
  );
}
