// Flame icon using user-provided SVG.
// active=true  → full colour + flicker animation (≥1 task done today)
// active=false → same shape, gray gradient version (no CSS filter)

export function FlameIcon({ active = true, size = 36, className = "" }) {
  // Conditional fills — no CSS filter needed
  const outerFill  = active ? "url(#flameMain)"  : "url(#grayMain)";
  const innerFill  = active ? "url(#flameInner)" : "url(#grayInner)";
  const coreFill   = active ? "#FFE566"          : "#E2E8F0";
  const glowFill   = active ? "url(#flameCtr)"   : "none";

  return (
    <>
      {active && (
        <style>{`
          @keyframes flame-flicker {
            0%, 100% { transform: scaleY(1)    scaleX(1);    }
            40%       { transform: scaleY(1.07) scaleX(0.93); }
            70%       { transform: scaleY(0.95) scaleX(1.05); }
          }
          .flame-lit {
            animation: flame-flicker 1.8s ease-in-out infinite;
            transform-origin: 50% 100%;
          }
        `}</style>
      )}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${className}${active ? " flame-lit" : ""}`}
        style={{ display: "block" }}
      >
        <defs>
          {/* ── Active (colour) gradients ── */}
          <radialGradient id="flameCtr" cx="50%" cy="80%" r="60%">
            <stop offset="0%"   stopColor="#FF2D00" />
            <stop offset="40%"  stopColor="#FF6A00" />
            <stop offset="100%" stopColor="#FFD000" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="flameMain" x1="50%" y1="100%" x2="50%" y2="0%">
            <stop offset="0%"   stopColor="#FF1A00" />
            <stop offset="30%"  stopColor="#FF6600" />
            <stop offset="70%"  stopColor="#FF9500" />
            <stop offset="100%" stopColor="#FFD700" />
          </linearGradient>
          <linearGradient id="flameInner" x1="50%" y1="100%" x2="50%" y2="0%">
            <stop offset="0%"   stopColor="#FF4400" />
            <stop offset="50%"  stopColor="#FFAA00" />
            <stop offset="100%" stopColor="#FFEE44" />
          </linearGradient>

          {/* ── Inactive (gray) gradients ── */}
          <linearGradient id="grayMain" x1="50%" y1="100%" x2="50%" y2="0%">
            <stop offset="0%"   stopColor="#6B7280" />
            <stop offset="60%"  stopColor="#9CA3AF" />
            <stop offset="100%" stopColor="#D1D5DB" />
          </linearGradient>
          <linearGradient id="grayInner" x1="50%" y1="100%" x2="50%" y2="0%">
            <stop offset="0%"   stopColor="#9CA3AF" />
            <stop offset="100%" stopColor="#E5E7EB" />
          </linearGradient>
        </defs>

        {/* Outer flame */}
        <path
          d="M50 5
             C50 5, 70 25, 75 45
             C80 55, 78 60, 82 68
             C88 80, 85 95, 75 105
             C68 113, 58 116, 50 116
             C42 116, 32 113, 25 105
             C15 95, 12 80, 18 68
             C22 60, 20 55, 25 45
             C30 25, 50 5, 50 5Z"
          fill={outerFill}
        />
        {/* Mid flame */}
        <path
          d="M50 30
             C50 30, 63 48, 66 62
             C69 72, 67 80, 70 88
             C73 97, 68 108, 60 112
             C56 114, 52 115, 50 115
             C48 115, 44 114, 40 112
             C32 108, 27 97, 30 88
             C33 80, 31 72, 34 62
             C37 48, 50 30, 50 30Z"
          fill={innerFill}
          opacity="0.9"
        />
        {/* Inner bright core */}
        <path
          d="M50 62
             C50 62, 58 72, 60 82
             C61 89, 58 97, 54 102
             C52 104, 50 105, 50 105
             C50 105, 48 104, 46 102
             C42 97, 39 89, 40 82
             C42 72, 50 62, 50 62Z"
          fill={coreFill}
          opacity="0.85"
        />
        {/* Glow overlay (active only) */}
        <path
          d="M50 5
             C50 5, 70 25, 75 45
             C80 55, 78 60, 82 68
             C88 80, 85 95, 75 105
             C68 113, 58 116, 50 116
             C42 116, 32 113, 25 105
             C15 95, 12 80, 18 68
             C22 60, 20 55, 25 45
             C30 25, 50 5, 50 5Z"
          fill={glowFill}
          opacity="0.4"
        />
      </svg>
    </>
  );
}

export default FlameIcon;
