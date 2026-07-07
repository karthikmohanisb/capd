import Image from "next/image";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Image
            src="/icons/icon-512.png"
            alt="ISB"
            width={48}
            height={48}
            className="mx-auto mb-3 rounded-xl"
          />
          <h1 className="text-2xl font-semibold text-primary">CAPD</h1>
          <p className="mt-1 text-sm text-muted">Sign in with your ISB mail ID</p>
        </div>

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>

        <p className="mt-6 text-center text-xs text-muted">
          Students, first time signing in? Use the temporary code that has been shared by the
          CAPD team — you&apos;ll be asked to create a personal PIN right after that for future
          logins.
        </p>

        <p className="mt-4 text-center text-xs text-muted">
          In case of any technical glitches, write to{" "}
          <a href="mailto:karthik_m@isb.edu" className="text-primary hover:underline">
            karthik_m@isb.edu
          </a>
          .
        </p>
      </div>
    </main>
  );
}
