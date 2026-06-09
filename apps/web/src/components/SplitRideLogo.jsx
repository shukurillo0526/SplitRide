/**
 * Premium SVG logo for SPLITRIDE.
 * Sleek car silhouette with motion lines — replaces the childish 🚗 emoji.
 */
export default function SplitRideLogo({ size = 24, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Motion lines */}
      <path
        d="M2 24h6M2 20h4M2 28h4"
        stroke="url(#motionGrad)"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
      />
      {/* Car body */}
      <path
        d="M14 30.5c0 0 1.5-1 3-4l4-8c.8-1.6 2.2-2.5 4-2.5h8c2 0 3.5 1 4.5 2.8l3 5.2c.5.9.8 1.8.8 2.8v3.2c0 1.1-.9 2-2 2H16c-1.1 0-2-.9-2-2v-1.5z"
        fill="url(#carGrad)"
      />
      {/* Windshield */}
      <path
        d="M22 18.5l-3 7h14l-2.5-7H22z"
        fill="url(#windshieldGrad)"
        opacity="0.4"
      />
      {/* Roof line */}
      <path
        d="M20.5 18c1-2 2.5-3 4.5-3h5c2 0 3.5 1 4.5 3"
        stroke="url(#roofGrad)"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Front wheel */}
      <circle cx="21" cy="32" r="3.5" fill="#1a1a2e" stroke="url(#wheelGrad)" strokeWidth="1.5" />
      <circle cx="21" cy="32" r="1.2" fill="url(#hubGrad)" />
      {/* Rear wheel */}
      <circle cx="35" cy="32" r="3.5" fill="#1a1a2e" stroke="url(#wheelGrad)" strokeWidth="1.5" />
      <circle cx="35" cy="32" r="1.2" fill="url(#hubGrad)" />
      {/* Headlight */}
      <ellipse cx="40.5" cy="27" rx="1.5" ry="1" fill="#fbbf24" opacity="0.9" />
      {/* Headlight glow */}
      <ellipse cx="42" cy="27" rx="3" ry="2" fill="#fbbf24" opacity="0.15" />
      {/* Taillight */}
      <rect x="14" y="26" width="2" height="2.5" rx="0.5" fill="#ef4444" opacity="0.8" />
      
      <defs>
        <linearGradient id="carGrad" x1="14" y1="16" x2="42" y2="34">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="windshieldGrad" x1="19" y1="18" x2="33" y2="26">
          <stop offset="0%" stopColor="#a7f3d0" />
          <stop offset="100%" stopColor="#6ee7b7" />
        </linearGradient>
        <linearGradient id="roofGrad" x1="20" y1="15" x2="35" y2="15">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
        <linearGradient id="wheelGrad" x1="0" y1="28" x2="0" y2="36">
          <stop offset="0%" stopColor="#6b7280" />
          <stop offset="100%" stopColor="#374151" />
        </linearGradient>
        <linearGradient id="hubGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#9ca3af" />
          <stop offset="100%" stopColor="#6b7280" />
        </linearGradient>
        <linearGradient id="motionGrad" x1="0" y1="0" x2="8" y2="0">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
    </svg>
  );
}
