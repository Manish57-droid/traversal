-- ============================================================
-- 0016_class_materials — 2026-09-20
-- Lets a teacher upload reference documents (PDF/Word) to a class,
-- visible to every student who's joined it, to view or download for
-- practice. Flat list per class, no folders/versioning — same
-- posture as the rest of this app's file features.
-- ============================================================

create table if not exists class_materials (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  title text not null,
  file_path text not null,   -- storage object path, needed to delete the object
  file_url text not null,    -- public URL, used to view/download
  file_name text not null,   -- original filename, shown next to the download
  file_type text not null,   -- mime type
  file_size int not null,    -- bytes
  uploaded_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_class_materials_class on class_materials(class_id);

-- Storage bucket ("class-materials", public read, 20MB limit, PDF/
-- Word mime types only) is created lazily by the upload route itself
-- the first time it's needed (see app/api/classes/[id]/materials/
-- route.ts's ensureBucket) rather than via a one-off script someone
-- has to remember to run (0011's "proctored-question-images" bucket
-- needed that extra step) — no manual Dashboard step for this one.
-- No storage.objects RLS policy is added for writes: the upload goes
-- through a server API route using the service-role client (same
-- pattern as every other write in this app), which bypasses RLS by
-- design. Public READ works via the bucket's own `public: true` flag.

alter table class_materials enable row level security;
-- No policies — service-role only, same posture as every other table.
