"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ShieldAlert, Video } from "lucide-react";

interface TestDetail {
  id: string;
  name: string;
  description: string | null;
  time_limit_minutes: number;
  max_violations_before_autosubmit: number;
  require_camera: boolean;
  require_mic: boolean;
}

interface MyAttempt {
  id: string;
  status: string;
  score: number | null;
  total_questions: number | null;
}

export default function ProctoredTestStartPage() {
  const params = useParams<{ testId: string }>();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [test, setTest] = useState<TestDetail | null>(null);
  const [myAttempt, setMyAttempt] = useState<MyAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [mediaGranted, setMediaGranted] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/proctored-tests/${params.testId}`)
      .then((r) => r.json())
      .then((d) => {
        setTest(d.test ?? null);
        setMyAttempt(d.my_attempt ?? null);
      })
      .finally(() => setLoading(false));

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [params.testId]);

  async function requestMedia() {
    if (!test) return;
    setMediaError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: test.require_camera,
        audio: test.require_mic,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setMediaGranted(true);
    } catch (err: any) {
      setMediaGranted(false);
      setMediaError("Camera/mic permission was denied — this test requires it to start. Allow access and try again.");
    }
  }

  const needsMedia = !!(test?.require_camera || test?.require_mic);

  async function handleStart() {
    setError(null);
    if (needsMedia && !mediaGranted) {
      setMediaError("Grant camera/mic access above before starting.");
      return;
    }
    setStarting(true);

    // Fullscreen must be requested directly inside this user-gesture
    // handler (not after an earlier await) or browsers silently
    // refuse it — so it goes first, before the network call.
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // Some browsers/environments block fullscreen entirely (e.g. an
      // iframe without the allow attribute) — proceed anyway rather
      // than blocking the test outright; the fullscreen-exit violation
      // listener on the take screen simply won't have anything to fire.
    }

    try {
      const res = await fetch(`/api/proctored-tests/${params.testId}/attempts`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start the test.");
      router.push(`/student/proctored-tests/${params.testId}/take`);
    } catch (err: any) {
      setError(err.message);
      setStarting(false);
    }
  }

  if (loading) return <p className="text-sm text-fg-muted">Loading…</p>;
  if (!test) return <p className="card p-6 text-center text-sm text-fg-muted">Test not found.</p>;

  if (myAttempt && myAttempt.status === "in_progress") {
    router.replace(`/student/proctored-tests/${params.testId}/take`);
    return <p className="text-sm text-fg-muted">Resuming your test…</p>;
  }

  if (myAttempt && myAttempt.status !== "in_progress") {
    return (
      <div className="card mx-auto max-w-lg space-y-2 p-6 text-center">
        <p className="font-medium text-fg">You've already completed this test.</p>
        {myAttempt.score !== null && myAttempt.total_questions !== null && (
          <p className="text-2xl font-display text-fg">
            {myAttempt.score}/{myAttempt.total_questions}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="font-display text-2xl text-fg">{test.name}</h1>
        {test.description && <p className="mt-1 text-sm text-fg-muted">{test.description}</p>}
      </div>

      <div className="card space-y-3 p-5">
        <div className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
          <p className="text-sm text-fg">Before you begin, here's exactly what this test checks:</p>
        </div>
        <ul className="ml-6 list-disc space-y-1.5 text-sm text-fg-muted">
          <li>The test runs in fullscreen for {test.time_limit_minutes} minutes.</li>
          <li>Exiting fullscreen, switching tabs/windows, or attempting to copy question text is logged as a violation.</li>
          <li>
            After <strong className="text-fg">{test.max_violations_before_autosubmit}</strong> violations, the test
            auto-submits immediately with whatever you've answered so far.
          </li>
          {test.require_camera && <li>Your camera must stay on and visible for the whole test.</li>}
          {test.require_mic && <li>Your microphone must stay on for the whole test.</li>}
          <li className="text-fg-subtle">
            This only detects activity inside this browser tab — it cannot see other applications, other monitors, or
            remote-desktop software, and nothing is a guarantee against every form of cheating.
          </li>
          {needsMedia && (
            <li className="text-fg-subtle">
              Your camera/mic feed is checked live in the browser only — it is never recorded, saved, or uploaded
              anywhere.
            </li>
          )}
        </ul>
      </div>

      {needsMedia && (
        <div className="card space-y-3 p-5">
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-fg-muted" />
            <p className="text-sm font-medium text-fg">Camera/mic check</p>
          </div>
          {test.require_camera && (
            <video
              ref={videoRef}
              muted
              playsInline
              className="aspect-video w-full rounded-lg border border-line/70 bg-bg object-cover"
            />
          )}
          {!mediaGranted ? (
            <button onClick={requestMedia} className="btn-secondary w-full justify-center text-sm">
              Grant camera/mic access
            </button>
          ) : (
            <p className="text-xs text-success">Camera/mic looks good — live and ready.</p>
          )}
          {mediaError && <p className="text-sm text-red-400">{mediaError}</p>}
        </div>
      )}

      <button onClick={handleStart} disabled={starting} className="btn-primary w-full justify-center">
        {starting ? "Starting…" : "Start Test"}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
