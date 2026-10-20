"use client";
// The hold countdown (rule L1, the checkout hook): minutes and seconds left on the hold, in Western digits (N1) and as its own
// left-to-right run (R3). It counts from the time left when the server rendered the page, not from the device clock, so a phone
// whose clock is off still shows the right time. Remount it (change `key`) when a new hold starts.
import { useEffect, useRef, useState } from "react";

export function clockLabel(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function HoldCountdown({
  remainingMs,
  warnMs,
  onWarn,
  onExpire,
  className,
}: {
  remainingMs: number;
  warnMs?: number;
  onWarn?: () => void;
  onExpire?: () => void;
  className?: string;
}) {
  const [left, setLeft] = useState(remainingMs);
  const warned = useRef(remainingMs <= (warnMs ?? 0));
  const expired = useRef(remainingMs <= 0);
  const callbacks = useRef({ onWarn, onExpire });

  useEffect(() => {
    callbacks.current = { onWarn, onExpire };
  });

  useEffect(() => {
    if (remainingMs <= 0) return;
    const mountedAt = Date.now();
    const id = window.setInterval(() => {
      const next = Math.max(0, remainingMs - (Date.now() - mountedAt));
      setLeft(next);
      if (!warned.current && warnMs !== undefined && next <= warnMs) {
        warned.current = true;
        callbacks.current.onWarn?.();
      }
      if (!expired.current && next <= 0) {
        expired.current = true;
        window.clearInterval(id);
        callbacks.current.onExpire?.();
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [remainingMs, warnMs]);

  return (
    <span role="timer" className={["ltr-run tabular font-bold", className].filter(Boolean).join(" ")}>
      {clockLabel(left)}
    </span>
  );
}
