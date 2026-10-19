// Lagoon water surface with a sand shoreline, ported from the approved theme board (HeroLight, draft 3).
// Pure SVG: no images, no JS. Keep the filter values; Dr Ayman approved this exact look.
import type { ReactNode } from "react";

export function WaterHero({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={["relative overflow-hidden bg-sand-50 text-white", className].join(" ")}>
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1440 900" aria-hidden="true">
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
          <filter id="grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="5" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.42  0 0 0 0 0.36  0 0 0 0 0.27  0 0 0 0.9 -0.35" />
          </filter>
        </defs>
        <rect width="1440" height="780" fill="url(#lagoon)" />
        <rect width="1440" height="780" filter="url(#caustic)" opacity="0.18" />
        <rect y="560" width="1440" height="220" fill="url(#shallow)" />
        <path d="M0 742 C 180 718, 340 770, 540 748 S 900 712, 1100 744 S 1340 770, 1440 738 L 1440 900 L 0 900 Z" fill="#DBD3BF" />
        <path d="M0 742 C 180 718, 340 770, 540 748 S 900 712, 1100 744 S 1340 770, 1440 738" fill="none" stroke="#FFFFFF" strokeOpacity="0.75" strokeWidth="4" />
        <path d="M0 770 C 220 752, 420 790, 640 772 S 1000 748, 1200 770 S 1380 786, 1440 768 L 1440 900 L 0 900 Z" fill="#EFEBE2" />
        <rect y="740" width="1440" height="160" filter="url(#grain)" opacity="0.4" />
      </svg>
      <div className="relative">{children}</div>
    </section>
  );
}
