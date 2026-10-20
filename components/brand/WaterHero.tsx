// Lagoon water surface with a sand shoreline, ported from the approved theme board (HeroLight, draft 3).
// Pure SVG: no images, no JS. Keep the filter values; Dr Ayman approved this exact look.
//
// Two layers. The water fills the section (slice, anchored to the bottom so the shallow band meets the shore). The
// shoreline is its own bottom-anchored SVG stretched to the width, with a height tied to the section, so the sand is
// always visible: in one SVG the shore sat at a fixed place in the viewBox and was cropped away on wide or short heroes.
import type { ReactNode } from "react";

export function WaterHero({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={["relative overflow-hidden bg-sand-50 text-white", className].join(" ")}>
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMax slice" viewBox="0 0 1440 900" aria-hidden="true">
        <defs>
          <linearGradient id="lagoon" x1="0" y1="0" x2="1" y2="0.6">
            <stop offset="0" stopColor="#065E78" />
            <stop offset="0.45" stopColor="#08708E" />
            <stop offset="0.8" stopColor="#0194BE" />
            <stop offset="1" stopColor="#02B3CA" />
          </linearGradient>
          <linearGradient id="shallow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#02B3CA" stopOpacity="0" />
            <stop offset="1" stopColor="#7EE3F2" stopOpacity="0.55" />
          </linearGradient>
          <filter id="caustic" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="turbulence" baseFrequency="0.006 0.018" numOctaves="2" seed="7" />
            <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -7 0 0 0 1.15" />
          </filter>
        </defs>
        <rect width="1440" height="900" fill="url(#lagoon)" />
        <rect width="1440" height="900" filter="url(#caustic)" opacity="0.18" />
        <rect y="620" width="1440" height="280" fill="url(#shallow)" />
      </svg>
      <svg
        className="absolute inset-x-0 bottom-0 h-[clamp(72px,min(22%,30vw),200px)] w-full"
        preserveAspectRatio="none"
        viewBox="0 0 1440 220"
        aria-hidden="true"
      >
        <defs>
          <filter id="grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="5" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.42  0 0 0 0 0.36  0 0 0 0 0.27  0 0 0 0.9 -0.35" />
          </filter>
        </defs>
        {/* wet sand at the waterline, then dry sand; the foam line follows the wet crest */}
        <path d="M0 62 C 240 18, 440 112, 720 72 S 1180 16, 1440 66 L 1440 220 L 0 220 Z" fill="#DBD3BF" />
        <path d="M0 62 C 240 18, 440 112, 720 72 S 1180 16, 1440 66" fill="none" stroke="#FFFFFF" strokeOpacity="0.8" strokeWidth="4" vectorEffect="non-scaling-stroke" />
        <path d="M0 112 C 260 84, 480 156, 760 120 S 1200 82, 1440 114 L 1440 220 L 0 220 Z" fill="#EFEBE2" />
        <rect width="1440" height="220" filter="url(#grain)" opacity="0.4" />
      </svg>
      <div className="relative">{children}</div>
    </section>
  );
}
