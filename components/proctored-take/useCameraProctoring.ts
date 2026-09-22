"use client";

import { useEffect, useRef } from "react";
import { FaceLandmarker, ObjectDetector, FilesetResolver } from "@mediapipe/tasks-vision";

// Every check here runs against the live video element already
// attached to the exam's camera stream — nothing is ever uploaded or
// stored; frames are analyzed in-browser (WASM) and discarded
// immediately, same privacy posture as the rest of this screen (see
// project.md's proctoring "honest limits" section, which this extends
// rather than contradicts).
//
// These are heuristics, not certainties, and that's disclosed on
// purpose rather than oversold:
//  - phone detection is a general-purpose object detector
//    (EfficientDet-Lite0), not phone-specific — small/angled/partially
//    covered phones can be missed, and a similarly-shaped object could
//    in principle be misread.
//  - "multiple people" counts distinct FACES the model finds, which is
//    far more reliable than counting body-shaped blobs, but still
//    depends on both faces being lit and facing roughly toward the
//    camera.
//  - "talking" is read from the jawOpen blendshape sustained across
//    several samples — real speech, chewing, and a long yawn can all
//    look similar to this signal; there's no audio involved at all.
//  - head-pose-from-landmarks (looking away) is the least precise of
//    the four, which is exactly why the task treats it as a toast
//    warning, never a logged violation.
const DETECTION_INTERVAL_MS = 2500;
const VIOLATION_COOLDOWN_MS = 15_000;
const PHONE_SCORE_THRESHOLD = 0.5;
const MULTI_FACE_STREAK_REQUIRED = 2; // consecutive ticks, ~5s, before it counts
const YAW_RATIO_THRESHOLD = 0.28; // nose offset from eye-midpoint, as a fraction of eye distance
const JAW_OPEN_THRESHOLD = 0.35;
const TALK_WINDOW_SIZE = 4; // ~10s of samples
const TALK_HITS_REQUIRED = 3; // mouth open in at least 3 of the last 4 samples

// jsDelivr, not self-hosted: the WASM runtime bundled with this
// package is ~35MB across its SIMD/non-SIMD variants — too large to
// commit into this repo or serve from our own bucket. Pinned to the
// exact installed package version so this never silently drifts to
// an incompatible runtime build.
const WASM_BASE_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";

const FACE_LANDMARKER_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const OBJECT_DETECTOR_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite";

interface CameraProctoringCallbacks {
  onPhoneDetected: () => void;
  onMultiplePeople: () => void;
  onTalkingDetected: () => void;
  onLookingAway: () => void;
}

/**
 * Starts (and cleans up) the camera-vision proctoring loop for a
 * `<video>` element that's already playing the exam's camera stream.
 * `active` gates the whole thing — pass `test.require_camera` so this
 * never runs (and never even downloads the ML models) for a test that
 * didn't ask for a camera.
 */
export function useCameraProctoring(
  videoRef: React.RefObject<HTMLVideoElement>,
  active: boolean,
  callbacks: CameraProctoringCallbacks
) {
  // Captured via a ref so the effect below only depends on `active` —
  // a new inline callback identity on every parent render must not
  // tear down and reload the ML models.
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    let faceLandmarker: FaceLandmarker | null = null;
    let objectDetector: ObjectDetector | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const lastFiredAt: Partial<Record<keyof CameraProctoringCallbacks, number>> = {};
    const jawOpenHistory: boolean[] = [];
    let multiFaceStreak = 0;

    function maybeFire(type: keyof CameraProctoringCallbacks) {
      const now = Date.now();
      if (now - (lastFiredAt[type] ?? 0) < VIOLATION_COOLDOWN_MS) return;
      lastFiredAt[type] = now;
      callbacksRef.current[type]();
    }

    async function init() {
      try {
        const fileset = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
        const [fl, od] = await Promise.all([
          FaceLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: FACE_LANDMARKER_MODEL_URL, delegate: "GPU" },
            runningMode: "VIDEO",
            numFaces: 3,
            outputFaceBlendshapes: true,
            outputFacialTransformationMatrixes: false,
          }),
          ObjectDetector.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: OBJECT_DETECTOR_MODEL_URL, delegate: "GPU" },
            runningMode: "VIDEO",
            scoreThreshold: PHONE_SCORE_THRESHOLD,
          }),
        ]);

        if (cancelled) {
          fl.close();
          od.close();
          return;
        }
        faceLandmarker = fl;
        objectDetector = od;

        intervalId = setInterval(() => {
          const video = videoRef.current;
          if (!video || video.readyState < 2 || video.videoWidth === 0) return;
          const now = performance.now();

          try {
            const objResult = objectDetector!.detectForVideo(video, now);
            const phoneSeen = objResult.detections.some((d) =>
              d.categories.some(
                (c) => c.categoryName.toLowerCase().includes("phone") && c.score >= PHONE_SCORE_THRESHOLD
              )
            );
            if (phoneSeen) maybeFire("onPhoneDetected");
          } catch {
            // Best-effort — one failed inference tick shouldn't affect the exam.
          }

          try {
            const faceResult = faceLandmarker!.detectForVideo(video, now);
            const faces = faceResult.faceLandmarks;

            if (faces.length >= 2) {
              multiFaceStreak++;
              if (multiFaceStreak >= MULTI_FACE_STREAK_REQUIRED) maybeFire("onMultiplePeople");
            } else {
              multiFaceStreak = 0;
            }

            // Pose/mouth checks only make sense with exactly one face —
            // with zero, there's nothing to read; with two+, whose face
            // would it even be measuring.
            if (faces.length === 1) {
              const face = faces[0];
              // Standard MediaPipe Face Mesh topology: 1 = nose tip, 33 =
              // left eye outer corner, 263 = right eye outer corner.
              const nose = face[1];
              const leftEye = face[33];
              const rightEye = face[263];
              if (nose && leftEye && rightEye) {
                const eyeDist = Math.abs(rightEye.x - leftEye.x) || 1;
                const yawRatio = (nose.x - (leftEye.x + rightEye.x) / 2) / eyeDist;
                if (Math.abs(yawRatio) > YAW_RATIO_THRESHOLD) {
                  callbacksRef.current.onLookingAway();
                }
              }

              const jawOpen =
                faceResult.faceBlendshapes[0]?.categories.find((c) => c.categoryName === "jawOpen")?.score ?? 0;
              jawOpenHistory.push(jawOpen > JAW_OPEN_THRESHOLD);
              if (jawOpenHistory.length > TALK_WINDOW_SIZE) jawOpenHistory.shift();
              if (jawOpenHistory.length === TALK_WINDOW_SIZE) {
                const hits = jawOpenHistory.filter(Boolean).length;
                if (hits >= TALK_HITS_REQUIRED) {
                  maybeFire("onTalkingDetected");
                  jawOpenHistory.length = 0;
                }
              }
            }
          } catch {
            // Best-effort — one failed inference tick shouldn't affect the exam.
          }
        }, DETECTION_INTERVAL_MS);
      } catch (err) {
        // Model/WASM failed to load (blocked asset, no WebGL2, very low-
        // end device, offline...) — the screen's other checks
        // (fullscreen/tab/copy/camera-off) are unaffected; this is
        // additive, never required for the exam to proceed.
        console.warn("Camera proctoring vision models failed to load:", err);
      }
    }

    init();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      faceLandmarker?.close();
      objectDetector?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}
