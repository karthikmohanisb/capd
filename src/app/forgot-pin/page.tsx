"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPinReset } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FormError } from "@/components/ui/field";

export default function ForgotPinPage() {
  const [state, formAction, pending] = useActionState(requestPinReset, undefined);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-foreground">Reset your PIN</h1>
          <p className="mt-1 text-sm text-muted">
            Enter your institutional email and we&apos;ll send a link to set a new PIN.
          </p>
        </div>

        {state?.success ? (
          <p className="rounded-card bg-success-surface px-4 py-3 text-sm text-success">
            {state.success}
          </p>
        ) : (
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

            <FormError message={state?.error} />

            <Button type="submit" loading={pending} className="mt-2 w-full">
              Send reset link
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm">
          <Link href="/login" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
