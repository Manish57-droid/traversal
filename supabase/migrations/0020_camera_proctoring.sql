-- ============================================================
-- 0020_camera_proctoring — 2026-09-22
-- Adds three new violation types for the take screen's camera-based
-- checks (components/proctored-take/useCameraProctoring.ts): a phone
-- visible in frame, a second person/face visible, and sustained mouth
-- movement heuristically read as talking. All three run entirely
-- client-side via MediaPipe Tasks Vision (WASM runtime loaded from
-- jsDelivr, ML model weights from Google's MediaPipe model bucket —
-- see the hook for both URLs) — the camera frame is analyzed in the
-- browser and never uploaded or stored, same privacy posture as
-- every other check on this screen (see project.md's proctoring
-- "honest limits" section). A fourth check (head turned away from
-- the screen) is deliberately a toast warning only, not logged here —
-- per the task, it nudges the student rather than counting against
-- them, since head-pose-from-landmarks is the least precise of the
-- four signals.
--
-- Postgres requires ALTER TYPE ... ADD VALUE to run outside a
-- transaction that also uses the new value — this migration only adds
-- values, nothing here reads them, so it's safe to run as-is in the
-- Supabase SQL editor.
-- ============================================================

alter type proctored_violation_type add value if not exists 'phone_detected';
alter type proctored_violation_type add value if not exists 'multiple_people';
alter type proctored_violation_type add value if not exists 'talking_detected';
