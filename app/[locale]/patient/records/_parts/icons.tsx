// Icons for the records screens. Camera, photo and document never mirror (rule R2); they sit beside a text label, so they are
// hidden from screen readers.

export function CameraIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className} style={{ transform: "none" }}>
      <path
        d="M3 6.5A1.5 1.5 0 0 1 4.5 5h2l1.2-1.6A1 1 0 0 1 8.5 3h3a1 1 0 0 1 .8.4L13.5 5h2A1.5 1.5 0 0 1 17 6.5v8a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 14.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10.5" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function DocumentIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className} style={{ transform: "none" }}>
      <path d="M5 2.75h6.5L15.25 6.5v10.75H5z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M11.25 2.75V6.75h4M7.5 10h5M7.5 13h5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function PhotoIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className} style={{ transform: "none" }}>
      <rect x="3" y="4" width="14" height="12" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 14l4-4 3 3 2-2 4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="13" cy="7.5" r="1.25" fill="currentColor" />
    </svg>
  );
}

/** Exclamation in a circle, for a failed step or an unreadable page; never mirrored. */
export function AlertIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={className} style={{ transform: "none" }}>
      <path d="M8 4.5v4.25" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="8" cy="11.5" r="1.1" fill="currentColor" />
    </svg>
  );
}
