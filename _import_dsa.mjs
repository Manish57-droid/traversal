import { createClient } from "@supabase/supabase-js";
import fs from "fs";
function loadEnv(path) {
  const text = fs.readFileSync(path, "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return env;
}
const env = loadEnv(new URL("./.env.local", import.meta.url));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: admin } = await supabase.from("users").select("id, email").eq("role", "admin").limit(1).maybeSingle();
if (!admin) throw new Error("No admin account found to attribute import to.");
console.log("Attributing import to:", admin.email);

const seed = JSON.parse(fs.readFileSync("./_dsa_seed_data.json", "utf8"));
console.log(`Seed file has ${seed.length} entries.`);

let inserted = 0;
let skipped = 0;
const BATCH = 50;
for (let i = 0; i < seed.length; i += BATCH) {
  const batch = seed.slice(i, i + BATCH);
  for (const q of batch) {
    const { data: existing } = await supabase
      .from("questions")
      .select("id")
      .eq("title", q.title)
      .eq("topic", q.topic)
      .maybeSingle();
    if (existing) {
      skipped++;
      continue;
    }
    const { error } = await supabase.from("questions").insert({
      title: q.title,
      url: null,
      platform: "other",
      difficulty: "unknown",
      topic: q.topic,
      needs_link_curation: true,
      created_by: admin.id,
    });
    if (error) {
      console.error("FAILED:", q.title.slice(0, 60), error.message);
      continue;
    }
    inserted++;
  }
  console.log(`...processed ${Math.min(i + BATCH, seed.length)}/${seed.length}`);
}

console.log(`\nInserted: ${inserted}, skipped (duplicate title+topic): ${skipped}`);

const { count: total } = await supabase.from("questions").select("*", { count: "exact", head: true });
const { count: needsLink } = await supabase.from("questions").select("*", { count: "exact", head: true }).eq("needs_link_curation", true);
const { count: hasLink } = await supabase.from("questions").select("*", { count: "exact", head: true }).eq("needs_link_curation", false);

console.log(`\nFinal: ${total} total questions, ${hasLink} with real links, ${needsLink} flagged needs_link_curation.`);

const { data: byTopicRows } = await supabase.from("questions").select("topic");
const byTopic = {};
for (const row of byTopicRows ?? []) {
  const t = row.topic ?? "(no topic)";
  byTopic[t] = (byTopic[t] ?? 0) + 1;
}
console.log("\nBy topic:");
console.log(JSON.stringify(byTopic, null, 2));
