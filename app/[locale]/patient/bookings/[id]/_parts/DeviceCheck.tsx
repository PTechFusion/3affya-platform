"use client";
// Test your device, the hook of screen 21 (rule G4: a one-tap pre-call check, nothing to install). One tap asks the browser for
// the camera and microphone, then shows the camera preview and a live microphone level. Ending the test stops every track; so
// does leaving the page. Nothing is recorded, stored or sent. Each failure says what to do next (rule L4).
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, CheckIcon } from "@/components/ui";

type Status = "idle" | "asking" | "live" | "passed" | "blocked" | "missing" | "unsupported" | "failed";

const failureFor = (e: unknown): Status => {
  const name = e instanceof DOMException ? e.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "blocked";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "missing";
  return "failed";
};

export function DeviceCheck() {
  const t = useTranslations("booking.device");
  const [status, setStatus] = useState<Status>("idle");
  const videoRef = useRef<HTMLVideoElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const frameRef = useRef<number | null>(null);

  const release = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void audioRef.current?.close().catch(() => undefined);
    audioRef.current = null;
  }, []);

  // Leaving the page ends the test.
  useEffect(() => release, [release]);

  // Once the live panel is on screen, wire the preview and the level meter to the stream. The meter writes the bar's width
  // straight to the element each frame, so the page does not re-render 60 times a second.
  useEffect(() => {
    const stream = streamRef.current;
    if (status !== "live" || !stream) return;
    if (videoRef.current) videoRef.current.srcObject = stream;
    try {
      const context = new AudioContext();
      audioRef.current = context;
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      context.createMediaStreamSource(stream).connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);
      const tick = () => {
        analyser.getByteTimeDomainData(samples);
        let peak = 0;
        for (const s of samples) peak = Math.max(peak, Math.abs(s - 128));
        if (barRef.current) barRef.current.style.width = `${Math.min(100, Math.round((peak / 64) * 100))}%`;
        frameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // No Web Audio: the preview still shows, the bar stays empty.
    }
  }, [status]);

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      return;
    }
    setStatus("asking");
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStatus("live");
    } catch (e) {
      release();
      setStatus(failureFor(e));
    }
  };

  const end = () => {
    release();
    setStatus("passed");
  };

  if (status === "live") {
    return (
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          aria-label={t("preview")}
          // A self-view reads as a mirror; this flips the picture, not the layout.
          className="aspect-video w-full -scale-x-100 rounded-[var(--radius-field)] bg-night object-cover sm:w-56"
        />
        <div className="min-w-0 flex-1">
          <p role="status" className="flex items-center gap-2 font-semibold text-ink-900">
            <span aria-hidden="true" className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-success text-white">
              <CheckIcon />
            </span>
            {t("ok")}
          </p>
          <p className="mt-1 text-sm text-ink-700">{t("micHint")}</p>
          <p className="mt-2 text-xs font-semibold text-ink-700">{t("level")}</p>
          <div aria-hidden="true" className="mt-1 h-2.5 w-full overflow-hidden rounded-[var(--radius-tag)] bg-white">
            <div ref={barRef} className="h-full w-0 rounded-[var(--radius-tag)] bg-lagoon-600" />
          </div>
          <Button type="button" variant="secondary" className="mt-3 w-full sm:w-auto" onClick={end}>
            {t("stop")}
          </Button>
        </div>
      </div>
    );
  }

  const message =
    status === "asking" ? t("asking") : status === "passed" ? t("ok") : status === "idle" ? null : t(status);
  const problem = status === "blocked" || status === "missing" || status === "unsupported" || status === "failed";

  return (
    <div className="mt-3">
      {message ? (
        <p
          role={problem ? "alert" : "status"}
          className={["mb-3 flex items-start gap-2 text-sm", problem ? "text-danger" : "font-semibold text-ink-900"].join(" ")}
        >
          {status === "passed" ? (
            <span aria-hidden="true" className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-success text-white">
              <CheckIcon />
            </span>
          ) : null}
          {message}
        </p>
      ) : null}
      {status === "unsupported" ? null : (
        <Button
          type="button"
          variant={status === "idle" ? "primary" : "secondary"}
          disabled={status === "asking"}
          className="w-full sm:w-auto"
          onClick={start}
        >
          {status === "idle" || status === "asking" ? t("start") : t("again")}
        </Button>
      )}
    </div>
  );
}
