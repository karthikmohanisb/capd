// One-off bootstrap script: creates admin account(s). There is no admin
// sign-up UI by design — admins are provisioned directly against Supabase.
// Unlike students, admins log in with this password permanently (no forced
// PIN reset) — the 6-digit-PIN flow exists to give students something easy
// to remember, not because it's a stronger credential.
//
// Usage:
//   npx tsx scripts/create-admin.ts you@institution.edu "A Strong-Password1" "Jane Doe"
//   npx tsx scripts/create-admin.ts        (prompts for each value instead)

import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { createClient } from "@supabase/supabase-js";
import readline from "node:readline/promises";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const [, , emailArg, passwordArg, ...nameParts] = process.argv;

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const email = (emailArg ?? (await rl.question("Admin email: "))).trim().toLowerCase();
  const password = passwordArg ?? (await rl.question("Password (min 6 characters): "));
  const fullName = nameParts.length
    ? nameParts.join(" ")
    : await rl.question("Full name (optional): ");

  rl.close();

  if (!email || !password || password.length < 6) {
    console.error("An email and a password of at least 6 characters are required.");
    process.exit(1);
  }

  const supabase = createClient(url!, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    console.error("Could not create the auth user:", createError?.message);
    process.exit(1);
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: created.user.id,
    email,
    full_name: fullName || null,
    role: "admin",
    status: "active",
    must_set_pin: false,
  });

  if (profileError) {
    console.error("Auth user was created, but the profile row failed:", profileError.message);
    console.error(`Fix it by inserting a profiles row with id = ${created.user.id}.`);
    process.exit(1);
  }

  console.log(`\nAdmin account created for ${email}.`);
  console.log("They can log in with this email and password right away.\n");
}

main();
