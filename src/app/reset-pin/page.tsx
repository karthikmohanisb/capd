import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/dal";
import { PinForm } from "@/components/pin-form";

export default async function ResetPinPage() {
  const profile = await getCurrentProfile();

  if (!profile || profile.status !== "active") {
    redirect("/login?error=" + encodeURIComponent("That reset link is invalid or has expired."));
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-foreground">Set a new PIN</h1>
          <p className="mt-1 text-sm text-muted">
            Choose a new 6-digit PIN. You&apos;ll use it with your email to sign in.
          </p>
        </div>
        <PinForm />
      </div>
    </main>
  );
}
