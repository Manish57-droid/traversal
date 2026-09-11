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

const seed = JSON.parse(fs.readFileSync("./_aptitude_seed_data.json", "utf8"));

let inserted = 0;
let skipped = 0;
for (const q of seed) {
  const { data: existing } = await supabase
    .from("aptitude_questions")
    .select("id")
    .eq("prompt", q.prompt)
    .maybeSingle();
  if (existing) {
    skipped++;
    continue;
  }
  const { error } = await supabase.from("aptitude_questions").insert({
    category: q.category,
    topic: q.topic,
    prompt: q.prompt,
    options: q.options,
    correct_option: q.correct_option,
    explanation: q.explanation ?? null,
    difficulty: "unknown",
    created_by: admin.id,
  });
  if (error) {
    console.error("FAILED:", q.prompt.slice(0, 60), error.message);
    continue;
  }
  inserted++;
}

console.log(`\nInserted: ${inserted}, skipped (duplicate prompt): ${skipped}`);

const { data: all } = await supabase.from("aptitude_questions").select("category, topic");
const byCategoryTopic = {};
for (const row of all ?? []) {
  byCategoryTopic[row.category] ??= {};
  byCategoryTopic[row.category][row.topic] = (byCategoryTopic[row.category][row.topic] ?? 0) + 1;
}
console.log("\nFinal counts by category/topic:");
console.log(JSON.stringify(byCategoryTopic, null, 2));
