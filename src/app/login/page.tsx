import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-foreground">CAPD</h1>
          <p className="mt-1 text-sm text-muted">Sign in with your institutional email</p>
        </div>

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>

        <p className="mt-6 text-center text-xs text-muted">
          Students, first time signing in? Use the temporary code your administrator shared
          with you — you&apos;ll be asked to create a personal PIN right after.
        </p>
      </div>
    </main>
  );
}
