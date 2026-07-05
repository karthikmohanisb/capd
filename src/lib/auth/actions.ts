"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, pinSchema } from "./validation";

export type ActionState = { error: string } | undefined;

export async function login(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    code: formData.get("code"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.code,
  });

  if (signInError) {
    return {
      error:
        "That email and code combination isn't recognized. Check both and try again.",
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Something went wrong. Please try again." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status, must_set_pin")
    .eq("id", user.id)
    .single();

  if (!profile || profile.status !== "active") {
    await supabase.auth.signOut();
    return {
      error: "This account is not active. Contact your administrator.",
    };
  }

  if (profile.must_set_pin) {
    redirect("/set-pin");
  }

  redirect(profile.role === "admin" ? "/admin" : "/attendance");
}

export async function setPin(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = pinSchema.safeParse({
    pin: formData.get("pin"),
    confirmPin: formData.get("confirmPin"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.pin,
  });

  if (updateError) {
    return { error: "Could not set your PIN. Please try again." };
  }

  const { error: rpcError } = await supabase.rpc("complete_pin_setup");
  if (rpcError) {
    return {
      error:
        "Your PIN was set, but something went wrong finishing setup. Please log in again.",
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  redirect(profile?.role === "admin" ? "/admin" : "/attendance");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
