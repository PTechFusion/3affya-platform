"use client";
// The email as a mail client shows it: its own document in an iframe, so the page's styles cannot touch it and the email's
// width rules (600 px, fluid below) behave as they do in Gmail or Outlook. The frame grows to the email's height, and follows it
// when the width changes. Same-origin so it can be measured; no scripts run inside (the email has none, and the sandbox blocks
// them).
import { useCallback, useEffect, useRef, useState } from "react";

export function EmailFrame({ html, title }: { html: string; title: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(640);
  const observer = useRef<ResizeObserver | null>(null);

  // The body's own height (the document's scrollHeight never drops below the frame), plus the frame's 1 px border top and bottom.
  const fit = useCallback(() => {
    const body = ref.current?.contentDocument?.body;
    if (body) setHeight(Math.ceil(body.getBoundingClientRect().height) + 2);
  }, []);

  const onLoad = useCallback(() => {
    fit();
    const body = ref.current?.contentDocument?.body;
    observer.current?.disconnect();
    if (body && typeof ResizeObserver !== "undefined") {
      observer.current = new ResizeObserver(fit);
      observer.current.observe(body);
    }
  }, [fit]);

  useEffect(() => {
    // The frame may have loaded before hydration attached onLoad.
    if (ref.current?.contentDocument?.readyState === "complete") onLoad();
    return () => observer.current?.disconnect();
  }, [onLoad, html]);

  return (
    <iframe
      ref={ref}
      title={title}
      srcDoc={html}
      onLoad={onLoad}
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      className="block w-full rounded-[var(--radius-card)] border border-sand-200 bg-sand-50"
      style={{ height }}
    />
  );
}
