-- ============================================================
-- 0019_admin_user_management — 2026-09-22
-- Lets an admin create a login (any role) directly, and reset any
-- user's password, without the normal self-serve sign-up/forgot-
-- password flows. Both actions set a real password via Supabase
-- Auth's admin API (app/api/admin/users/route.ts POST,
-- app/api/admin/users/[id]/reset-password/route.ts) — this column is
-- the only new state needed: it marks that the password currently on
-- the account was admin-set and must be replaced before the account
-- is used further. middleware.ts redirects to /change-password
-- whenever it's true; that page clears it back to false once the
-- user sets their own password (app/api/account/password-changed).
-- ============================================================

alter table users add column if not exists force_password_change boolean not null default false;
