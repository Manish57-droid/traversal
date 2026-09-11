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

const seed = JSON.parse(fs.readFileSync("./_iprep_seed_data.json", "utf8"));

// These 6 categories already exist from the previous task's seeding —
// look them up by name rather than recreate. If any were missing,
// create with a reasonable icon/order.
const NAME_TO_SLUG_ICON = {
  "C++": { slug: "cpp", icon: "Code2", display_order: 1 },
  "Java": { slug: "java", icon: "Coffee", display_order: 2 },
  "Python": { slug: "python", icon: "Terminal", display_order: 3 },
  "DBMS": { slug: "dbms", icon: "Server", display_order: 5 },
  "Operating Systems": { slug: "os", icon: "Cpu", display_order: 6 },
  "Computer Networks": { slug: "networking", icon: "Network", display_order: 7 },
};

const categoryIds = {};
for (const name of Object.keys(NAME_TO_SLUG_ICON)) {
  const meta = NAME_TO_SLUG_ICON[name];
  const { data: existing } = await supabase.from("interview_categories").select("id").eq("slug", meta.slug).maybeSingle();
  if (existing) {
    categoryIds[name] = existing.id;
    console.log(`Category "${name}" already exists.`);
  } else {
    const { data: created, error } = await supabase
      .from("interview_categories")
      .insert({ name, slug: meta.slug, icon: meta.icon, display_order: meta.display_order })
      .select()
      .single();
    if (error) throw new Error(`category ${name}: ${error.message}`);
    categoryIds[name] = created.id;
    console.log(`Created category "${name}".`);
  }
}

let inserted = 0;
let skipped = 0;
for (const q of seed) {
  const categoryId = categoryIds[q.category];
  if (!categoryId) {
    console.error("Unknown category, skipping:", q.category);
    continue;
  }
  const { data: existing } = await supabase
    .from("interview_questions")
    .select("id")
    .eq("category_id", categoryId)
    .eq("question", q.question)
    .maybeSingle();
  if (existing) {
    skipped++;
    continue;
  }
  const { error } = await supabase.from("interview_questions").insert({
    category_id: categoryId,
    question: q.question,
    answer: q.answer,
    difficulty: "unknown",
    created_by: admin.id,
  });
  if (error) {
    console.error("FAILED:", q.question.slice(0, 60), error.message);
    continue;
  }
  inserted++;
}

console.log(`\nInserted: ${inserted}, skipped (duplicate question): ${skipped}`);

const { data: all } = await supabase
  .from("interview_questions")
  .select("category_id, interview_categories(name)");
const byCategory = {};
for (const row of all ?? []) {
  const name = row.interview_categories?.name ?? "Unknown";
  byCategory[name] = (byCategory[name] ?? 0) + 1;
}
console.log("\nFinal counts by category (all categories, not just these 6):");
console.log(JSON.stringify(byCategory, null, 2));
