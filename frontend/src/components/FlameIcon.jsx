// Flame icon — solid style matching the mobile Ionicons flame.
// active=true  → orange (#F97316) with glow
// active=false → gray (#CBD5E1), no glow

export function FlameIcon({ active = true, size = 36, className = "" }) {
  const color = active ? "#F97316" : "#CBD5E1";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{
        display: "block",
        filter: active ? "drop-shadow(0 0 8px rgba(249,115,22,0.65))" : "none",
        transition: "filter 0.3s ease, fill 0.3s ease",
      }}
    >
      {/* Ionicons flame — solid */}
      <path d="M 261.56 101.28 C 236.9 55.16 195.43 31.86 166.03 18.52 C 150.25 11.38 136.6 27.82 143.35 43.71 C 150.43 60.35 157.37 84.7 151.2 108.8 C 136.85 164.44 80 200 80 272 C 80 370.58 164.14 448 256 448 C 348.83 448 432 371.25 432 272 C 432 184.84 355.09 125.54 261.56 101.28 Z M 256 416 C 185.31 416 144 361.54 144 304 C 144 280.88 152.71 262.42 168 248 C 163.06 283.52 190.22 320 232 320 C 232 320 192 288 224 240 C 228 248 234.9 256 242 256 C 242 256 230 226 258 192 C 263.24 200.39 272 216 272 240 C 288 220 296 192 296 192 C 312 224 304 264 288 296 C 312 284 329.69 256.1 332.8 226.13 C 352 248 368 278 368 304 C 368 361.54 326.69 416 256 416 Z" />
    </svg>
  );
}

export default FlameIcon;
