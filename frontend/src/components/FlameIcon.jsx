// Animated SVG flame icon.
// active=false → gray (goal not reached yet)
// active=true  → orange with flicker animation (at least 1 task done today)

export function FlameIcon({ active = false, size = 36 }) {
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
        height={Math.round(size * 1.3)}
        viewBox="0 0 40 52"
        fill="none"
        className={active ? "flame-lit" : undefined}
        style={{ display: "block" }}
      >
        {/* Outer flame — clean upward teardrop, no inner concavities */}
        <path
          d="M20,50 C10,49 3,40 3,29 C3,18 9,8 20,3 C31,8 37,18 37,29 C37,40 30,49 20,50Z"
          fill={active ? "#F97316" : "#CBD5E1"}
          style={{ transition: "fill 0.5s ease" }}
        />
        {/* Inner core — smaller, higher, yellow when lit */}
        <path
          d="M20,43 C15,41 11,35 11,28 C11,20 15,13 20,10 C25,13 29,20 29,28 C29,35 25,41 20,43Z"
          fill={active ? "#FDE68A" : "#E2E8F0"}
          style={{ transition: "fill 0.5s ease" }}
        />
      </svg>
    </>
  );
}
