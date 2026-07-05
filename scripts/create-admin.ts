// One-off bootstrap script: creates the very first admin account(s).
// There is no admin sign-up UI by design — admins are provisioned directly
// against Supabase. Re-run this any time you need to add another admin.
//
// Usage:
//   npx tsx scripts/create-admin.ts you@institution.edu 654321 "Jane Doe"
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

const [, , emailArg, passcodeArg, ...nameParts] = process.argv;

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const email = (emailArg ?? (await rl.question("Admin email: "))).trim().toLowerCase();
  const passcode = passcodeArg ?? (await rl.question("Temporary passcode (min 6 characters): "));
  const fullName = nameParts.length
    ? nameParts.join(" ")
    : await rl.question("Full name (optional): ");

  rl.close();

  if (!email || !passcode || passcode.length < 6) {
    console.error("An email and a passcode of at least 6 characters are required.");
    process.exit(1);
  }

  const supabase = createClient(url!, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password: passcode,
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
    must_set_pin: true,
  });

  if (profileError) {
    console.error("Auth user was created, but the profile row failed:", profileError.message);
    console.error(`Fix it by inserting a profiles row with id = ${created.user.id}.`);
    process.exit(1);
  }

  console.log(`\nAdmin account created for ${email}.`);
  console.log(`Temporary passcode: ${passcode}`);
  console.log("They'll be asked to set a personal 6-digit PIN on first login.\n");
}

main();
