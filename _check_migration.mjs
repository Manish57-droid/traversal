import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const clean = line.replace(/\r$/, "");
  const m = clean.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
}
const supa = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { error: colErr } = await supa.from("proctored_questions").select("image_url").limit(1);
console.log("proctored_questions.image_url:", colErr ? colErr.message : "OK");

const { error: tableErr } = await supa.from("user_deletion_log").select("id").limit(1);
console.log("user_deletion_log table:", tableErr ? tableErr.message : "OK");

const { data, error: rpcErr } = await supa.rpc("admin_delete_user_cascade", { p_user_id: "00000000-0000-0000-0000-000000000000" });
console.log("admin_delete_user_cascade function:", rpcErr ? rpcErr.message : "OK (ran without error)");
