// Local admin tool — resets a user's password via the Supabase Admin API.
// Uses the service-role key from .env.local, so this only ever runs on
// your machine, never as part of the deployed app.
//
// Usage:
//   node scripts/reset-password.mjs someone@example.com newpassword123

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const [, , email, newPassword] = process.argv;

if (!email || !newPassword) {
  console.error("Usage: node scripts/reset-password.mjs <email> <new-password>");
  process.exit(1);
}

if (newPassword.length < 6) {
  console.error("Password must be at least 6 characters.");
  process.exit(1);
}

async function main() {
  const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf-8");
  const get = (key) => env.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1]?.trim();

  const supabase = createClient(get("NEXT_PUBLIC_SUPABASE_URL"), get("SUPABASE_SERVICE_ROLE_KEY"));

  const { data, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error(`ERROR: ${listError.message}`);
    process.exitCode = 1;
    return;
  }

  const user = data.users.find((u) => u.email === email);
  if (!user) {
    console.error(`No user found with email ${email}.`);
    process.exitCode = 1;
    return;
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
    password: newPassword,
  });

  if (updateError) {
    console.error(`ERROR: ${updateError.message}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Password reset for ${email}.`);
}

// Node/libuv on Windows can throw a spurious assertion if the process
// exits immediately after an in-flight fetch's keep-alive handle hasn't
// been cleaned up yet — setting process.exitCode and letting the event
// loop drain naturally (instead of calling process.exit()) avoids it.
await main();
