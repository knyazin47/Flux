// Animated SVG flame icon.
// active=false → gray (goal not reached yet)
// active=true  → orange with flicker animation (daily goal met)

export function FlameIcon({ active = false, size = 36 }) {
  return (
    <>
      {active && (
        <style>{`
          @keyframes flame-flicker {
            0%, 100% { transform: scaleY(1)    scaleX(1);    }
            33%       { transform: scaleY(1.06) scaleX(0.95); }
            66%       { transform: scaleY(0.96) scaleX(1.03); }
          }
          .flame-lit {
            animation: flame-flicker 2s ease-in-out infinite;
            transform-origin: 50% 100%;
          }
        `}</style>
      )}
      <svg
        width={size}
        height={Math.round(size * 1.25)}
        viewBox="0 0 40 50"
        fill="none"
        className={active ? "flame-lit" : undefined}
        style={{ display: "block" }}
      >
        {/* Outer flame body */}
        <path
          d="M20,46 C8,40 2,30 4,20 C5,13 9,8 13,5 C12,10 14,16 18,18 C16,10 17,4 20,2 C23,4 24,10 22,18 C26,16 28,10 27,5 C31,8 35,13 36,20 C38,30 32,40 20,46Z"
          fill={active ? "#F97316" : "#CBD5E1"}
          style={{ transition: "fill 0.5s ease" }}
        />
        {/* Inner core / glow */}
        <path
          d="M20,40 C14,36 11,28 12,23 C13,19 15,17 18,16 C17,20 18,24 20,26 C22,24 23,20 22,16 C25,17 27,19 28,23 C29,28 26,36 20,40Z"
          fill={active ? "#FCD34D" : "#E2E8F0"}
          style={{ transition: "fill 0.5s ease" }}
        />
      </svg>
    </>
  );
}
