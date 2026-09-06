# Traversal — DSA Practice & Progress

Redesign of the Traversal DSA module. Teachers build question sets from
LeetCode, CodeChef, Codeforces, GeeksforGeeks, HackerRank (or anywhere else)
and assign them to a class. Students solve on the real platform and check
questions off here, and everyone can read through DSA topics explained with
3D, step-through examples.

Stack: **Next.js 14 (App Router)** · **Supabase** (Postgres + Auth, via the
service-role key from the server only for data — no Prisma) · **Vercel**
(hosting) · **React Three Fiber** (3D visuals) · **Tailwind CSS**.

## Roles & approval

- **Student** — solves assigned questions, tracks their own progress, reads
  the 3D topic explanations. Cannot add their own practice links; everything
  on their sheet comes from a teacher's assignment.
- **Teacher** — builds the shared question bank, groups questions into named
  **question sets** (e.g. "Week 3 - Arrays"), assigns a whole set to a class
  at once, and sees a per-student progress rollup. Also reads the topic
  explanations.
- **Admin** — reserved for one email, hard-coded in the database (see below).
  Approves or rejects every new sign-up, and can change anyone's role.

At sign-up, a person enters their email/password/name and picks **Student**
or **Teacher**. That request lands as `pending` — they can't sign in
anywhere past the "waiting for approval" screen until the admin approves
them from `/admin/users`. The one exception is the hard-coded admin email,
which is auto-approved as `admin` the moment it signs up.

## 1. Supabase — database + auth

1. Create a project at supabase.com.
2. **Auth settings**: Dashboard → Authentication → Providers → make sure
   **Email** is enabled (it is by default). For the smoothest experience
   while you're setting this up, also go to Authentication → Sign In / Up →
   and turn **off** "Confirm email" — otherwise every sign-up has to click a
   confirmation link before they get a session. You can turn it back on
   later once you're ready for it.
3. Open the **SQL Editor** → **New query** → paste in the entire contents of
   `lib/supabase/schema.sql` from this repo → **Run**.
4. **This is the important part**: that script creates a Postgres trigger,
   `handle_new_user`, that fires every time someone signs up. It reads the
   role they picked and decides what to actually give them:
   - if the email matches `manishkushwaha572000@gmail.com` (hard-coded in
     the function) → role `admin`, auto-approved
   - if they picked "Teacher" → role `teacher`, status `pending`
   - otherwise → role `student`, status `pending`

   **If you ever want to change the admin email**, open the SQL Editor,
   find this line inside the `handle_new_user` function in `schema.sql`:
   ```sql
   admin_email text := 'manishkushwaha572000@gmail.com';
   ```
   change the email, and re-run just that `create or replace function`
   statement (no need to re-run the whole script).
5. Go to **Project Settings → API** and copy three values into `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL` (the "Project URL")
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the "anon public" key — used for
     sign-up/sign-in only)
   - `SUPABASE_SERVICE_ROLE_KEY` (the "service_role" key — **keep this
     secret**; the app only ever uses it in server code to read/write
     business data)
6. That's it — no separate auth provider to configure, no webhooks, no JWT
   templates. Signing up *is* what creates the profile row, automatically,
   via the trigger.

## 2. Environment variables

Copy `.env.example` to `.env.local` and fill in the three Supabase values
from step 1.5 above.

## 3. Run locally

```bash
npm install
npm run dev
```

Sign up once with your own email (pick Teacher or Student, doesn't matter
for testing) to see the "waiting for approval" screen. Then sign up again
with `manishkushwaha572000@gmail.com` (or whatever you set the admin email
to) — that account skips straight to `/admin/dashboard`, and from
`/admin/users` you can approve your first test account.

## 4. Deploy to Vercel

1. Push this repo to GitHub.
2. Import it in Vercel, add the same three environment variables there.
3. In Supabase, Dashboard → Authentication → URL Configuration, add your
   Vercel domain to both the Site URL and Redirect URLs — otherwise
   Supabase Auth will reject requests coming from the deployed site.

## How the pieces fit together

- **Auth**: Supabase Auth (email + password) issues a session cookie;
  `middleware.ts` refreshes that cookie on every request and looks up the
  caller's `role` + `status` from the `users` table. Not `approved` → sent
  to `/pending-approval`. Wrong role for `/teacher/*` or `/admin/*` → sent
  back to `/dashboard`. Every page layout re-checks the same thing
  server-side as defense in depth, and so does every API route via
  `lib/roles.ts`.
- **Sign-up → role**: handled entirely by the `handle_new_user` Postgres
  trigger described above — the app never inserts into `users` directly.
- **Question bank**: `/teacher/questions` — teacher/admin add links here.
  `lib/platform.ts` detects the platform from the URL's hostname (leetcode.com,
  codechef.com, codeforces.com, geeksforgeeks.org, hackerrank.com → labelled
  badge; anything else → "Other", link still works).
- **Question sets**: `/teacher/question-sets` — group questions from the bank
  into a named, reusable set.
- **Assigning**: `/teacher/assign` sends an entire set to a class in one
  action, creating a `progress` row for every (student, question) pair in
  that set so it shows up on each student's sheet immediately. Re-assigning,
  or assigning overlapping sets, never overwrites progress a student already
  made (upsert with `ignoreDuplicates`).
- **Student flow**: `/student/dsa` lists everything assigned to them — click
  through to solve on the real site, then cycle the status pill not started →
  attempted → completed. `/student/dashboard` rolls that up into an overall %
  and a per-topic breakdown, and is where a student enters a class join code
  (generated when a teacher creates a class).
- **Teacher flow**: `/teacher/dashboard` shows a per-student rollup for
  whichever class is selected.
- **Admin flow**: `/admin/dashboard` surfaces how many accounts are waiting
  on you, plus platform-wide counts. `/admin/users` is the approval queue —
  approve/reject a pending sign-up, or change anyone's role, at any time.
  Admin's nav also links straight into the teacher tools.
- **Topics (3D explanations)**: `/topics` lists four concepts — Arrays,
  Stacks, Linked Lists, Trees — each with a short written theory panel
  (definition, time complexity, real-world use cases) followed by a fixed,
  hand-authored sequence of steps (`lib/concepts/data.ts`) driving a
  dedicated Three.js scene (`components/concept/*Scene.tsx`) through
  `ConceptPlayer.tsx`, which adds play/pause, step forward/back, and a
  scrubbable progress row. This is static authored content, not stored in
  Supabase — adding a fifth topic means adding one more entry to that file,
  one more scene component, and a theory block.
- **3D hero**: `components/Hero3D.tsx` renders a slowly-rotating binary tree
  of glowing nodes with React Three Fiber on the landing page only, kept
  lightweight (no postprocessing) for phones and older laptops.

## What's intentionally left as a next step

- Real-time updates (Supabase Realtime) on the teacher dashboard instead of
  fetch-on-load — swap `useEffect` fetches for a subscription once you want
  live updates.
- Bulk CSV import for question banks.
- More topics under `/topics` (Graphs, Sorting, Searching, DP) — the pattern
  in `lib/concepts/data.ts` + a new scene component is already there to
  extend.
- Email notifications when an account is approved/rejected (Supabase can
  send these via an Edge Function trigger on `users` updates, if you want it).
- The aptitude/placement-prep section and any other Traversal modules beyond
  DSA — this pass is scoped to DSA + auth/roles, ready for those to be added
  as new top-level routes reusing the same layouts and role checks.

## Open questions for you

1. **Question titles** — since most judges block server-side scraping, a
   question's title is a cleaned-up guess from the URL slug, editable by the
   teacher before saving.
2. **One class per student, or several?** — right now a student can join more
   than one class, and a teacher can run several classes. Say if you want a
   student capped to one class.
3. **Rejected accounts** — right now "Reject" just sets a status; the person
   still sees a "not approved" screen if they try to sign in, but nothing
   stops them from signing up again with a different email. Let me know if
   you want anything stronger here (e.g. blocking by email domain).
