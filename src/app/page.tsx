import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/dal";

export default async function Home() {
  const profile = await getCurrentProfile();

  if (!profile || profile.status !== "active") {
    redirect("/login");
  }

  if (profile.must_set_pin) {
    redirect("/set-pin");
  }

  redirect(profile.role === "admin" ? "/admin" : "/attendance");
}
