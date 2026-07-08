import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const admins = [
  { email: "SRIRAM_RAGHAVAN@ISB.EDU", password: "Admin@CAPD26", name: "Sriram Raghavan" },
  { email: "steven_paul@isb.edu", password: "Admin@CAPD26", name: "Steven Paul" },
];

async function setupAdmins() {
  console.log("🔧 Setting up admin accounts...\n");
  
  for (const admin of admins) {
    try {
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: admin.email,
        password: admin.password,
        email_confirm: true,
      });

      if (authError) {
        console.error(`❌ ${admin.email}: ${authError.message}`);
        continue;
      }

      console.log(`✅ Created: ${admin.email}`);
    } catch (err) {
      console.error(`❌ ${admin.email}: ${err.message}`);
    }
  }
  console.log("\n✅ Admin setup complete!");
}

setupAdmins();
