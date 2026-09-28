-- ============================================================
-- 0026_proctored_violation_types_v2 — 2026-09-28
-- Two gaps found in real use: covering the camera lens triggered
-- nothing at all (no violation type existed for "no face visible"),
-- and turning away from the screen was only ever a client-side toast
-- (0020_camera_proctoring.sql's comment explicitly called this out as
-- intentional, "least precise... never a logged violation" — real use
-- showed that's too lenient). Both become real, server-recorded
-- violations now; see components/proctored-take/useCameraProctoring.ts
-- for the detection logic.
-- ============================================================

alter type proctored_violation_type add value if not exists 'looking_away';
alter type proctored_violation_type add value if not exists 'face_not_visible';
